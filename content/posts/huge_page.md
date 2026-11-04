---
title: "论文阅读：Practical, Transparent Operating System Support for Superpages"
date: '2026-11-04T11:50:28+08:00'
draft: false
tags: [操作系统, 虚拟内存, Superpages, Huge Pages, TLB, 内存管理, 论文阅读]
categories: [操作系统, 论文阅读]
---

# 一、论文概述

**论文：** Practical, Transparent Operating System Support for Superpages

**作者：** Juan Navarro, Sitaram Iyer, Peter Druschel, Alan Cox

**发表会议：** OSDI 2002

**研究方向：** Virtual Memory、Superpages、Memory Management

**论文链接：** [Practical, Transparent Operating System Support for Superpages](https://www.usenix.org/events/osdi02/tech/full_papers/navarro/navarro.pdf)

这篇论文研究了一个非常实际的操作系统问题：如何在不要求应用程序修改代码的情况下，让操作系统透明地使用大页（Superpages），从而降低虚拟地址转换的开销，提高程序性能。

现代处理器使用 TLB（Translation Lookaside Buffer）缓存虚拟地址到物理地址的转换关系。随着物理内存容量和应用程序工作集不断增大，有限的 TLB 容量越来越难以覆盖整个工作集，TLB Miss 可能成为影响程序性能的重要因素。

使用更大的页面可以显著提高 TLB Coverage，减少 TLB Miss。但是，大页也带来了新的挑战：

1. 大页要求物理内存连续且满足对齐要求。
2. 物理内存长期运行后容易产生碎片。
3. 如果应用只使用大页中的一小部分，会造成严重的内部碎片。
4. 大页粒度较粗，不利于精细的页面回收和 Dirty Page 管理。
5. 操作系统需要在性能、内存利用率和管理开销之间进行权衡。

论文基于 FreeBSD 4.3，在 Alpha 处理器上实现了一套透明的多级 Superpage 管理机制。它不仅解决了大页分配问题，还重新设计了页面置换、页面提升、页面拆分和脏页管理策略。

本文主要介绍论文的核心设计，并讨论其与现代 Linux THP 和 xv6 的联系。

# 二、为什么需要 Superpages？

## 2.1 TLB 与地址转换

虚拟内存系统通过页表（Page Table）将虚拟地址转换为物理地址。

处理器访问内存时，首先查询 TLB。如果命中，就可以直接获得对应的物理地址；如果未命中，则需要进行页表遍历（Page Table Walk），获取转换关系并更新 TLB。

```text
             Virtual Address
                    |
                    v
                  TLB
                    |
           +--------+--------+
           |                 |
         Hit                Miss
           |                 |
           v                 v
    Physical Address    Page Table Walk
           |                 |
           |                 v
           |           Update TLB
           |                 |
           +--------+--------+
                    |
                    v
              Memory Access
```

TLB 容量有限，因此它能够覆盖的虚拟内存范围也有限。

假设 TLB 有 128 个条目，每个条目映射一个 4KB 页面，那么：

\[
128 \times 4KB = 512KB
\]

也就是说，这个 TLB 最多缓存 512KB 的地址转换关系。

如果应用程序频繁访问 1GB 的工作集，显然不可能将所有地址转换关系都保存在 TLB 中，大量 TLB Miss 就可能成为性能瓶颈。

## 2.2 使用大页提高 TLB Coverage

Superpage 是比普通页面更大的页面。

假设普通页面大小为 4KB，大页大小为 2MB：

| 页面大小 | TLB 条目数量 | TLB Coverage |
|---|---:|---:|
| 4KB | 128 | 512KB |
| 2MB | 128 | 256MB |

相同数量的 TLB 条目，使用 2MB 页面可以覆盖更大的内存范围。

大页的主要收益包括：

- 增大 TLB Coverage。
- 减少 TLB Miss。
- 降低页表遍历频率。
- 减少部分页表管理开销。

因此，大页特别适合具有较大内存工作集、空间局部性较好且访问模式相对稳定的应用。

## 2.3 使用大页的代价

大页并不是越大越好。

假设一个 2MB Superpage 中，应用实际上只访问了 4KB：

```text
2MB Superpage

+--------------------------------------+
| 4KB Used |         Unused             |
+--------------------------------------+
```

如果操作系统分配整个 2MB，就会产生大量内部碎片（Internal Fragmentation）。

此外，大页还要求物理内存连续。

例如，要分配一个 2MB 的大页，操作系统必须找到一段连续且满足 2MB 对齐要求的物理内存。

但是，系统长期运行后，物理内存可能变成：

```text
Physical Memory:

+------+------+------+------+------+------+
| Used | Free | Used | Free | Used | Free |
+------+------+------+------+------+------+
```

即使系统拥有足够多的空闲页面，也可能无法找到足够大的连续区域。

这就是外部碎片化（External Fragmentation）。

因此，大页管理需要同时解决两个问题：

1. 如何获得足够大的连续物理内存？
2. 如何避免大页造成过多的内存浪费？

这也是论文研究的核心。

# 三、论文的整体设计

论文提出了一套透明的 Superpage 管理机制。

所谓透明，是指应用程序不需要显式申请大页，也不需要修改自己的内存访问逻辑。操作系统根据内存访问情况，自动决定何时使用大页、何时拆分大页。

论文的主要设计可以概括为：

| 设计 | 解决的问题 |
|---|---|
| Reservation-based Allocation | 提前保证物理内存连续性 |
| Incremental Promotion | 逐步将普通页面提升为大页 |
| Reservation Preemption | 回收未充分使用的预留区域 |
| Contiguity-aware Page Replacement | 通过页面置换恢复物理内存连续性 |
| Speculative Demotion | 拆分大页，恢复细粒度管理 |
| Dirty Superpage Management | 避免不必要的大量磁盘写回 |

其中，Reservation-based Allocation 和 Incremental Promotion 是理解整篇论文的关键。

# 四、Reservation-based Allocation：预留连续物理内存

## 4.1 传统 Demand Paging 的问题

传统 Demand Paging 采用按需分配策略。

假设一个进程申请了一段连续的虚拟内存：

```text
Virtual Memory:

+------+------+------+------+
|  A   |  B   |  C   |  D   |
+------+------+------+------+
```

当进程第一次访问某个页面时，发生 Page Fault，操作系统从空闲物理页面中分配一个页面。

例如：

```text
Page Fault 1 -> Physical Page 12
Page Fault 2 -> Physical Page 87
Page Fault 3 -> Physical Page 21
Page Fault 4 -> Physical Page 95
```

最终可能得到：

```text
Virtual Pages:       Physical Pages:

+------+------+      +------+------+------+------+
|  A   |  B   |      |  12  |  87  |  21  |  95  |
+------+------+      +------+------+------+------+
```

虽然虚拟地址连续，但是物理页面不连续。

因此，后续即使这些页面全部被访问，也无法直接将它们合并成一个 Superpage。

如果想使用大页，操作系统就必须重新寻找连续的物理内存，并将已经分配的页面迁移过去。

这种方式称为 Relocation-based Allocation。

页面迁移需要复制数据、更新页表以及处理 TLB，成本较高。

## 4.2 Reservation-based Allocation 的核心思想

论文提出了另一种思路：

**不要等到页面分散分配之后才考虑大页，而是在第一次分配时就提前预留一块连续的物理内存。**

例如，进程第一次访问某个 4MB 区域中的页面：

```text
Virtual Memory:

+----------------------------------+
|             4MB Region           |
+----------------------------------+
```

操作系统尝试为这个区域预留一块连续的 4MB 物理内存：

```text
Physical Memory:

+----------------------------------+
|          4MB Reserved            |
+----------------------------------+
```

这里需要区分两个概念：

- Reservation：预留物理内存的位置，保证后续分配的页面具有连续性。
- Mapping：真正建立虚拟地址到物理地址的映射。

预留不意味着立即分配全部页面，也不意味着立即建立整个 4MB 的 Superpage 映射。

假设程序目前只访问了第一个 4KB 页面：

```text
Reserved Physical Region:

+------+------+------+------+------+
| Used | Free | Free | Free | Free |
+------+------+------+------+------+
```

操作系统只分配并映射第一个页面，其余页面仍然处于预留状态。

当程序后续访问其他页面时，就从之前预留的区域中分配对应的物理页面。

这样既保留了 Demand Paging 的按需分配特性，又提前保证了物理页面的连续性。

## 4.3 为什么不在第一次访问时直接建立 Superpage？

假设程序申请了 4MB 内存，但实际上只访问了其中的 4KB。

如果第一次 Page Fault 时就直接建立 4MB Superpage，那么剩余没有真正分配的页面也可能变得可访问。

这会破坏 Demand Paging 的语义，并造成大量内存浪费。

因此，论文采用以下策略：

```text
第一次访问：

    Reserve a large contiguous physical region
    Allocate one base page
    Map one base page

后续访问：

    Allocate pages from reservation
    Map individual base pages

所有 base pages 都被填充：

    Promote to superpage
```

**Reservation 保证未来能够使用大页，而按需分配保证不会提前浪费物理内存。**

这是论文最重要的设计思想之一。

# 五、Incremental Promotion：逐步提升页面大小

有了 Reservation，操作系统就可以在页面逐渐被填充时，将普通页面提升为大页。

论文实验平台 Alpha 支持四种页面大小：

| 页面类型 | 页面大小 |
|---|---:|
| Base Page | 8KB |
| Superpage 1 | 64KB |
| Superpage 2 | 512KB |
| Superpage 3 | 4MB |

## 5.1 为什么需要 Incremental Promotion？

假设操作系统预留了一个 4MB 的连续物理区域。

如果程序目前只访问了 64KB，那么直接等待整个 4MB 被填满才建立大页，就可能错过使用较小 Superpage 的机会。

论文采用逐级提升的策略：

```text
8KB -> 64KB -> 512KB -> 4MB
```

例如：

```text
阶段 1：一个 Base Page 被分配

+------+------+------+------+------+
| Used | Free | Free | Free | Free |
+------+------+------+------+------+

阶段 2：64KB 区域被完全填充

+------+------+------+------+------+
| Used | Used | Used | Used | Used |
+------+------+------+------+------+

       Promote to 64KB

阶段 3：512KB 区域被完全填充

       Promote to 512KB

阶段 4：4MB 区域被完全填充

       Promote to 4MB
```

论文只在满足相应对齐要求的连续区域被完全填充时进行 Promotion。

这样可以避免为了建立大页而提前分配尚未使用的页面。

## 5.2 Promotion 是否需要复制页面？

不需要像传统 Relocation-based Allocation 那样重新搬迁页面。

因为在最初的 Reservation 阶段，操作系统已经保证了物理内存连续性。

Promotion 主要是修改页表，让处理器将原来的一组 Base Page 识别为更大的页面映射。

```text
Before Promotion:

Virtual Address
      |
      v
+------+------+------+------+
| PTE0 | PTE1 | PTE2 | PTE3 |
+------+------+------+------+
   |      |      |      |
   v      v      v      v
 Physical contiguous pages


After Promotion:

Virtual Address
      |
      v
+---------------------------+
|       Superpage PTE       |
+---------------------------+
              |
              v
       Physical Superpage
```

需要注意，具体页表表示与处理器架构有关。论文使用的 Alpha 处理器采用 PTE Replication：仍然为每个 Base Page 保留 PTE，只是更新其中的页面大小字段。

# 六、解决内存碎片：Reservation Preemption

Reservation-based Allocation 虽然能够保证物理页面连续性，但也带来了新的问题：

如果操作系统不断预留大块连续物理内存，系统很快就可能找不到新的连续区域。

而且，部分 Reservation 可能只使用了很少的物理页面。

例如：

```text
Reservation A: 4MB
    Used: 8KB
    Free: 4088KB

Reservation B: 4MB
    Used: 2MB
    Free: 2MB

Reservation C: 4MB
    Used: 4MB
    Free: 0
```

如果另一个进程需要 512KB 连续物理内存，但系统已经无法提供，就需要考虑回收之前的 Reservation。

## 6.1 Preempting Reservations

论文提出 Reservation Preemption：

**在物理内存不足时，抢占尚未充分使用的 Reservation，将其中未分配的物理页面归还给系统。**

例如：

```text
Before:

Reservation A (4MB)

+--------+--------+--------+--------+
| Used   | Free   | Free   | Free   |
+--------+--------+--------+--------+

After Preemption:

+--------+--------+--------+--------+
| 8KB    | Free   | Free   | Free   |
+--------+--------+--------+--------+
```

其中：

- 已经分配的页面继续保留。
- 未使用的页面返回物理内存分配器。
- 剩余区域可以根据情况重新组织为较小的 Reservation。

## 6.2 如何选择需要抢占的 Reservation？

论文采用基于最近分配时间的策略。

优先抢占最近没有发生过页面分配的 Reservation。

理由是：

- 最近仍在持续分配页面的 Reservation，可能很快就会被进一步填充。
- 长时间没有新页面分配的 Reservation，后续继续填充的可能性相对较低。

论文维护 Reservation List，并根据最近一次分配时间进行组织。

这是一种简单的预测策略：通过历史分配行为估计 Reservation 的未来使用价值。

需要强调，抢占的是尚未分配的预留页面，而不是直接释放已经被应用程序使用的页面。

# 七、Contiguity-aware Page Replacement：考虑连续性的页面置换

仅仅回收 Reservation 还不够。

因为系统运行一段时间后，已经真正分配出去的页面也可能导致严重的物理内存碎片。

传统页面置换算法主要考虑页面是否最近被访问过，例如 LRU 及其近似算法。

但是，如果操作系统希望持续支持 Superpage，那么页面置换还应该考虑一个因素：

**换出哪些页面能够帮助恢复更大的连续物理内存区域？**

这就是 Contiguity-aware Page Replacement。

## 7.1 传统 Page Replacement 的局限

假设物理内存如下：

```text
+------+------+------+------+------+------+
| Used | Used | Free | Used | Free | Used |
+------+------+------+------+------+------+
```

传统页面置换可能根据页面访问情况选择若干冷页面。

但是它不一定考虑这些页面在物理内存中的位置关系。

即使换出了多个页面，也未必能形成足够大的连续区域。

## 7.2 Contiguity-aware 的设计思路

论文希望优先回收那些能够帮助恢复较大连续物理区域的页面。

例如：

```text
Physical Memory:

+------+------+------+------+------+------+
| Used | Cold | Used | Cold | Cold | Used |
+------+------+------+------+------+------+
```

通过选择合适的 Cold Page 进行置换，可以让 Buddy Allocator 合并更多相邻的空闲页面。

论文在 FreeBSD 的 Page Daemon 中实现了这种策略。

主要包括：

1. 将 Cache Page 也纳入 Buddy Allocator 的管理，使其能够参与连续区域的合并。
2. 不仅在内存不足时唤醒 Page Daemon，当系统无法获得所需大小的连续区域时，也会唤醒它。
3. Page Daemon 扫描 Inactive List，优先回收有助于满足连续内存需求的页面。
4. 对已经关闭文件对应的干净页面，积极将其移动到 Inactive List，增加可供选择的页面数量。

这样，页面置换的目标就从单纯回收内存，扩展为同时恢复物理内存连续性。

## 7.3 为什么不直接使用 Memory Compaction？

另一个思路是将分散的物理页面复制到一起，这就是 Memory Compaction。

但是页面迁移需要：

- 复制页面内容。
- 更新页表映射。
- 处理 TLB。
- 处理页面并发访问。

论文尽量避免通过迁移页面来恢复连续性，而是通过选择合适的页面进行置换，让 Buddy Allocator 重新合并空闲区域。

当然，如果需要的连续区域中存在大量活跃页面，仅靠页面置换也不可能恢复连续性。

# 八、Speculative Demotion：主动拆分大页

前面介绍了 Promotion，即从小页面升级为大页面。

那么，什么时候需要反过来拆分 Superpage？

这就是 Demotion。

## 8.1 为什么需要 Demotion？

假设一个进程曾经使用了一个 4MB Superpage：

```text
+--------------------------------------+
|             4MB Superpage            |
+--------------------------------------+
```

但一段时间后，程序只访问其中很小的一部分：

```text
+--------+--------+--------+--------+
| Active | Active |  Idle  |  Idle  |
+--------+--------+--------+--------+
```

如果继续将整个区域作为 4MB Superpage 管理，就可能无法准确判断哪些 Base Page 真正活跃。

原因在于：

硬件通常只维护一个 Superpage 级别的 Reference Bit。

只要 4MB 中任意部分被访问，整个 Superpage 都可能被认为最近访问过。

操作系统无法区分：

- 整个 4MB 都在使用。
- 只有其中 8KB 在使用。

这会影响页面回收的准确性。

## 8.2 Speculative Demotion 的思路

论文提出，在内存压力下，操作系统可以主动拆分 Superpage，重新观察各个 Base Page 的访问状态。

例如：

```text
Before:

+--------------------------------------+
|             4MB Superpage            |
+--------------------------------------+

After:

+----------------+---------------------+
| 512KB Superpage| 512KB Superpage     |
+----------------+---------------------+
| 512KB Superpage| 512KB Superpage     |
+----------------+---------------------+
```

还可以继续拆分：

```text
512KB -> 64KB -> 8KB
```

这种逐级拆分可以减少不必要的页表更新。

## 8.3 为什么叫 Speculative？

因为操作系统并不知道一个大页内部究竟有多少页面仍然活跃。

它通过主动 Demotion，重新获得更细粒度的 Reference Bit 信息。

基本流程：

1. Page Daemon 检查页面的引用状态。
2. 如果存在内存压力，主动拆分对应 Superpage。
3. 重新观察各个 Base Page 的访问情况。
4. 将长期未访问的页面放入置换候选集合。
5. 如果后续发现所有页面都在被访问，则可以重新 Promotion。

论文实验实现使用的概率参数 p=1，即在相应的内存压力处理过程中执行这种拆分策略。

核心思想是：

**当硬件只能提供粗粒度的访问信息时，操作系统可以通过调整页面粒度，重新获得细粒度的信息。**

# 九、Dirty Superpage：如何处理大页的脏状态？

这是论文中非常值得关注的一个细节。

## 9.1 大页的 Dirty Bit 问题

假设一个 4MB Superpage 由 512 个 8KB Base Page 组成。

程序只修改了其中一个页面：

```text
4MB Superpage:

+------+------+------+------+------+
| Dirty| Clean| Clean| Clean| Clean|
+------+------+------+------+------+
```

但是硬件只提供 Superpage 级别的 Dirty Bit。

一旦这个 Superpage 被标记为 Dirty，操作系统就无法判断究竟哪个 Base Page 被修改了。

如果需要将其写回磁盘，就可能需要写回整个 4MB。

但实际上可能只有 8KB 被修改。

这会导致写回数据量放大 512 倍。

## 9.2 通过 Demotion 恢复细粒度 Dirty 信息

论文采用的策略是：

**当一个 Clean Superpage 中的任意 Base Page 第一次被修改时，将整个 Superpage Demote。**

例如：

```text
Before:

+--------------------------------------+
|              4MB Superpage           |
|                Clean                 |
+--------------------------------------+

Write to one Base Page
             |
             v

Demote to smaller pages

+------+------+------+------+------+
| Dirty| Clean| Clean| Clean| Clean|
+------+------+------+------+------+
```

这样操作系统重新获得每个 Base Page 的 Dirty 状态。

写回磁盘时，就只需要写回真正被修改的页面。

## 9.3 为什么不通过 Hash 判断页面是否被修改？

论文还讨论了一种替代方案：

在页面从磁盘加载时，为每个 Base Page 计算 Hash。

当整个 Superpage 需要写回时：

1. 重新计算每个 Base Page 的 Hash。
2. 与原来的 Hash 比较。
3. 只有内容发生变化的页面才写回磁盘。

作者尝试了 SHA-1，但实验发现 Hash 计算带来了明显开销：

- 磁盘密集型应用最多增加约 15% 开销。
- 某些极端场景下性能下降达到 60%。

因此，作者最终没有采用这种方案，而是选择通过 Demotion 恢复细粒度 Dirty 信息。

这个案例体现了论文的设计哲学：

**不能为了追求大页带来的性能收益，而让少数异常场景出现无法接受的退化。**

# 十、实验结果

论文在 Compaq XP-1000 上进行了实验。

| 硬件参数 | 配置 |
|---|---|
| CPU | Alpha 21264 500MHz |
| RAM | 512MB |
| Base Page | 8KB |
| Superpage | 64KB / 512KB / 4MB |
| Data TLB | 128 entries |
| Instruction TLB | 128 entries |

操作系统基于 FreeBSD 4.3，整个实现约 3500 行 C 代码。

## 10.1 不同应用的性能收益

论文中的一些代表性结果：

| Benchmark | 加速比 |
|---|---:|
| Matrix Transposition | 7.546× |
| Apsi | 1.827× |
| MCF | 1.676× |
| FFTW | 1.549× |
| Tree | 1.503× |
| Linker | 1.326× |
| Image | 1.228× |

其中 Matrix Transposition 的结果非常突出。

其使用的是非分块矩阵转置算法：

```c
for (int i = 0; i < N; i++) {
    for (int j = 0; j < N; j++) {
        B[j][i] = A[i][j];
    }
}
```

访问矩阵 B 时，内存访问模式可能产生大量跨页面访问。

论文指出，该测试的访问模式几乎每两次内存访问就产生一次 TLB Miss，因此对地址转换性能非常敏感。

使用 Superpage 后，TLB Miss 显著减少，最终获得约 7.5 倍加速。

## 10.2 为什么需要多种 Superpage Size？

不同应用的最佳页面大小并不相同。

论文实验发现：

- SP：64KB 表现较好。
- VPR：512KB 表现较好。
- FFTW：4MB 表现较好。

例如，FFTW 使用 4MB Superpage 时获得约 1.55 倍加速，而较小页面几乎没有收益。

这说明页面大小应该根据应用实际使用模式动态选择，而不是固定使用某一种大页。

## 10.3 长时间运行后的性能

论文还设计了一个非常有意思的实验：

1. 先运行 Web Server。
2. 通过大量请求加载文件。
3. 让系统物理内存发生严重碎片化。
4. 再运行 FFTW。

在普通系统中，即使还有大量空闲内存，也可能无法分配 4MB 连续区域。

论文提出的 Contiguity-aware Page Replacement 能够逐步恢复连续性。

FFTW 连续运行四次后，获得的 4MB Superpage 数量分别为：

| 执行次数 | 4MB Superpage 数量 |
|---|---:|
| 第一次 | 20 |
| 第二次 | 35 |
| 第三次 | 38 |
| 第四次 | 40 |

最终性能接近最佳状态，获得约 55% 的加速。

与此同时，恢复连续性的机制对 Web Server 造成的额外性能损失只有约 3%。

这证明了大页管理不能只关注系统刚启动时的性能，还必须考虑长期运行后的内存碎片问题。

# 十一、联系现代 Linux：HugeTLB 和 Transparent Huge Pages

这篇论文发表于 2002 年，但其中的设计思想今天仍然具有实际价值。

Linux 已经提供了两类重要的大页机制：HugeTLB 和 Transparent Huge Pages。

## 11.1 HugeTLB

Linux 提供 HugeTLB，用于显式管理大页。

可以通过以下命令查看大页相关信息：

```bash
cat /proc/meminfo | grep Huge
```

也可以查看：

```bash
cat /sys/kernel/mm/hugepages/
```

HugeTLB 通常需要提前预留大页池，应用程序可以通过 mmap 等接口使用。

它与论文中的 Reservation-based Allocation 有相似之处：

- 都重视连续物理内存。
- 都涉及大页预留和分配。
- 都需要考虑物理内存碎片。

但两者并不是同一种实现。论文强调透明的、按需建立的多尺寸 Superpage 管理，而 HugeTLB 是显式的大页池机制。

## 11.2 Transparent Huge Pages

Linux 还提供 Transparent Huge Pages（THP）。

它的目标与这篇论文非常接近：

**尽可能让应用程序透明地使用大页，而不要求应用程序修改代码。**

在 x86-64 Linux 上，普通页面通常为 4KB，而 THP 经常使用 2MB 页面。

THP 主要涉及：

- 在合适的条件下使用大页。
- 通过内存分配和缺页处理建立大页映射。
- 在必要时执行大页拆分。
- 在后台进行内存压缩（Compaction），寻找连续物理内存。

值得研究的内核组件和接口：

| 名称 | 作用 |
|---|---|
| `khugepaged` | 后台扫描并尝试合并页面 |
| `madvise()` | 向内核提供内存使用建议 |
| `MADV_HUGEPAGE` | 建议内核使用大页 |
| `MADV_NOHUGEPAGE` | 建议内核不使用大页 |
| `transhuge` | THP 内核文档和相关配置 |

官方文档：

[Linux Kernel Documentation: Transparent Hugepage Support](https://docs.kernel.org/admin-guide/mm/transhuge.html)

## 11.3 论文与 Linux THP 的设计对照

| 论文机制 | Linux 中相关概念 |
|---|---|
| Reservation-based Allocation | 大页分配与预留 |
| Incremental Promotion | THP 大页建立与合并 |
| Demotion | Huge Page Split |
| Contiguity-aware Replacement | 内存回收、Compaction |
| Dirty Superpage | 大页 Dirty Tracking 与拆分 |
| Buddy Allocator | Linux Buddy System |

需要注意，这只是设计思想层面的对应关系，并不意味着 Linux THP 直接采用了论文的全部算法。

尤其是论文采用 Reservation 来提前保证连续性，而现代 Linux THP 更多依赖 Buddy Allocator、Compaction、khugepaged 等机制获得和维护大页。

# 十二、联系 xv6：如何自己实现 Superpage？

如果希望将这篇论文转化为操作系统实践，可以从 xv6 的物理内存管理和页表管理入手。

## 12.1 首先理解 xv6 的普通页面分配

xv6 的物理内存分配器位于 `kernel/kalloc.c`。

核心逻辑非常简单：

```c
void *
kalloc(void)
{
    struct run *r;

    acquire(&kmem.lock);
    r = kmem.freelist;
    if (r)
        kmem.freelist = r->next;
    release(&kmem.lock);

    if (r)
        memset((char *)r, 5, PGSIZE);

    return (void *)r;
}
```

它从空闲链表中取出一个物理页面。

这里并没有考虑：

- 连续分配多个页面。
- 页面大小不同。
- 大页对齐。
- Reservation。
- 页面 Promotion / Demotion。

这正是论文试图改进的部分。

## 12.2 RISC-V 的大页支持

MIT xv6 使用 RISC-V Sv39 地址转换机制。

Sv39 支持通过不同级别的页表项建立不同粒度的映射：

| 页表级别 | 页面大小 |
|---|---:|
| Level 0 | 4KB |
| Level 1 | 2MB |
| Level 2 | 1GB |

因此，可以尝试给 xv6 增加 2MB Superpage 支持。

## 12.3 实现路线

**第一步：修改物理内存分配器。**

增加连续物理页面分配接口：

```c
void *kalloc_large(void);
void kfree_large(void *pa);
```

要求返回的物理地址满足 2MB 对齐，并且物理页面连续。

**第二步：修改页表映射逻辑。**

普通映射使用 Level 0 PTE。

大页映射则在 Level 1 建立 Leaf PTE。

注意，RISC-V 大页映射要求物理地址和虚拟地址满足相应页面大小的对齐要求。

**第三步：修改 Page Fault 处理。**

当进程首次访问一个虚拟地址时：

- 判断对应虚拟区域是否适合大页。
- 尝试分配 2MB 连续物理内存。
- 如果成功，按需建立映射。
- 如果不适合，则退回普通 4KB 页面。

**第四步：实现 Promotion 和 Demotion。**

当某个区域的 512 个 Base Page 都被分配后，可以考虑将它们转换成一个 2MB 映射。

反过来，如果需要回收其中某个 4KB 页面，就必须先拆分大页映射。

这里需要特别注意：

- 页表层级转换。
- TLB 刷新。
- 物理页面所有权。
- 对齐约束。
- 并发访问和页面回收。

这会是一个很有价值的 xv6 扩展实验。

# 十三、总结

这篇论文最重要的贡献，不是简单地证明 Superpage 能够提高 TLB Coverage，而是展示了一个看似简单的硬件特性，为什么会迫使操作系统重新设计物理内存分配、页面置换、页面回收和页表管理。

可以总结为：

| 问题 | 论文的解决方案 |
|---|---|
| 如何保证物理页面连续？ | Reservation-based Allocation |
| 如何逐步利用大页？ | Incremental Promotion |
| 如何回收未使用的预留内存？ | Reservation Preemption |
| 如何处理物理内存碎片？ | Contiguity-aware Page Replacement |
| 如何发现大页中的非活跃区域？ | Speculative Demotion |
| 如何避免 Dirty 大页产生大量磁盘 I/O？ | Dirty Superpage Demotion |
| 如何支持不同应用的工作集？ | Multiple Superpage Sizes |

我认为这篇论文最值得记住的系统设计思想是：

**操作系统不能只优化资源的当前使用效率，还必须考虑资源未来的可用性。**

Reservation-based Allocation 就是一个很好的例子：它看起来浪费了暂时未使用的物理内存，但实际上是在为未来创建大页保留连续性。

而 Preemption 和 Contiguity-aware Page Replacement 又让这种预留能够在必要时被回收。

这是一种典型的操作系统设计权衡：用适度的资源预留，换取长期、可持续的性能收益。

## 参考资料

1. Juan Navarro, Sitaram Iyer, Peter Druschel, Alan Cox. *Practical, Transparent Operating System Support for Superpages*. OSDI 2002. [论文 PDF](https://www.usenix.org/events/osdi02/tech/full_papers/navarro/navarro.pdf)
2. [MIT 6.1810 Paper Reading Homework: Superpages](https://pdos.csail.mit.edu/6.1810/2025/homework/paper-superpages.html)
3. [Linux Kernel Documentation: Transparent Hugepage Support](https://docs.kernel.org/admin-guide/mm/transhuge.html)
4. [Linux Kernel Documentation: Physical Memory](https://docs.kernel.org/mm/physical_memory.html)
