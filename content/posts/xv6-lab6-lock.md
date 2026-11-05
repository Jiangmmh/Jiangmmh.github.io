---
title: "MIT6.1810: Lab6 Lock"
date: '2026-11-05T16:41:33+08:00'
draft: false
tags: [xv6, RISC-V, 并发编程, 自旋锁, 内存管理]
categories: [操作系统]
---

# 一、Memory allocator (easy)

## 1. 物理内存分配器现状

当前 xv6 的物理内存管理策略比较简单：

- 将可用的物理内存划分为 4KB 大小的页面。
- 使用一个 freelist（空闲链表）将这些页面串联起来。
- 使用一个自旋锁保护 freelist，保证多核环境下链表操作的互斥性。
- 调用 `kalloc()` 和 `kfree()` 操作 freelist 之前先获取自旋锁，操作完成后释放锁。

更多细节可以参考我的[这篇博客](https://jiangmmh.github.io/posts/xv6-02/)。

按照实验要求，在 xv6 中运行 `kalloctest`：

```bash
$ kalloctest
start test1
test1 results:
--- lock kmem stats
lock: kmem: #test-and-set 67377 #acquire() 433136
--- top 5 contended locks:
lock: virtio_disk: #test-and-set 144638 #acquire() 183
lock: proc: #test-and-set 86684 #acquire() 667829
lock: proc: #test-and-set 78406 #acquire() 667827
lock: proc: #test-and-set 72893 #acquire() 270341
lock: kmem: #test-and-set 67377 #acquire() 433136
tot= 67377
test1 FAIL
start test2
total free number of pages: 32465 (out of 32768)
..........
test2 OK
start test3
..........child done 10000

test3 OK
start test4
............................child done 100000
.child done 100000
.child done 100000
--- lock kmem stats
lock: kmem: #test-and-set 989593 #acquire() 3377039
--- top 5 contended locks:
lock: wait_lock: #test-and-set 18470332 #acquire() 40032
lock: proc: #test-and-set 1525506 #acquire() 2552018
lock: kmem: #test-and-set 989593 #acquire() 3377039
lock: proc: #test-and-set 248206 #acquire() 1613804
lock: proc: #test-and-set 211798 #acquire() 1956210
tot= 989593
test4 FAIL m 190242 n 989593
```

### 1.1 理解锁竞争统计

在 lab lock 版本中，`acquire()` 函数会记录两个指标：

- `n`：获取锁的总次数。
- `nts`：执行原子交换操作时，发现锁已经被持有而失败的次数。

相关代码：

```c
// Mutual exclusion lock.
struct spinlock {
  uint locked;
  char *name;
  struct cpu *cpu;

#ifdef LAB_LOCK
  int nts;
  int n;
#endif
};

void
acquire(struct spinlock *lk)
{
  push_off();

  if (holding(lk))
    panic("acquire");

#ifdef LAB_LOCK
  __atomic_fetch_add(&lk->n, 1, __ATOMIC_RELAXED);
#endif

  while (__atomic_exchange_n(
      &lk->locked, 1, __ATOMIC_ACQUIRE) != 0) {
#ifdef LAB_LOCK
    __atomic_fetch_add(&lk->nts, 1, __ATOMIC_RELAXED);
#endif
  }

  lk->cpu = mycpu();
}
```

这里最值得关注的是：

```c
__atomic_exchange_n(&lk->locked, 1, __ATOMIC_ACQUIRE)
```

在 RISC-V 上，这类原子操作可以通过原子交换指令实现，例如 `amoswap.w.aq`。

`__ATOMIC_ACQUIRE` 保证成功获取锁时的 acquire 语义，避免临界区内的内存访问被重排到获取锁之前。

当锁已经被其他 CPU 持有时，原子交换返回非零值，当前 CPU 就会不断重试。这种反复尝试的过程就是自旋。

因此：

- `n` 反映锁被获取的频率。
- `nts` 反映获取锁时发生了多少次竞争失败。

如果 `nts` 很大，说明多个 CPU 经常需要争抢同一把锁。

实验中的 `kmem` 锁竞争非常明显，尤其是 test4：

```text
lock: kmem: #test-and-set 989593 #acquire() 3377039
```

这说明物理内存分配器已经成为多核并发访问中的一个性能瓶颈。

### 1.2 为什么会发生锁竞争？

根本原因在于：原来的 `kalloc()` 和 `kfree()` 共享同一个全局 freelist，并且整个链表只由一把自旋锁保护。

假设有四个 CPU 同时申请物理页面：

```text
CPU 0 ----\
CPU 1 -----+----> kmem.lock ----> freelist
CPU 2 -----+
CPU 3 ----/
```

即使四个 CPU 需要操作的是完全不同的物理页面，它们也必须争夺同一把锁。

实际上，freelist 的操作非常简单，通常只是修改链表头指针和页面的 `next` 指针。但由于所有 CPU 共享同一个锁，这些操作被强行串行化。

问题并不在于链表操作本身有多复杂，而在于**全局共享状态造成了不必要的同步**。

## 2. 改进物理内存管理策略

### 2.1 核心思路：Per-CPU freelist

既然多个 CPU 不应该总是争夺同一个 freelist，那么可以将全局 freelist 拆分为多个局部 freelist：

- 每个 CPU 维护自己的空闲页面链表。
- 每个 freelist 使用独立的自旋锁。
- CPU 优先从自己的 freelist 分配和释放页面。
- 当本地 freelist 为空时，再从其他 CPU 的 freelist 中窃取页面（stealing）。

整体结构变为：

```text
             Physical Memory
                    |
          +---------+---------+
          |         |         |
        CPU 0     CPU 1     CPU 2
          |         |         |
       freelist  freelist  freelist
          |         |         |
        lock 0    lock 1    lock 2
```

这样，大部分内存分配和释放操作都可以在本地完成，不需要与其他 CPU 竞争同一把锁。

这是一种典型的**局部化（locality）优化**：尽可能让 CPU 操作自己的数据，减少跨 CPU 的共享状态和同步开销。

### 2.2 数据结构设计

```c
struct kmem_cpu {
  struct spinlock lock;
  struct run *freelist;
  int npages;
} __attribute__((aligned(64)));

struct kmem_cpu kmem[NCPU];

int steal_hint[NCPU];
```

其中：

- `lock`：保护当前 CPU 的 freelist。
- `freelist`：当前 CPU 管理的空闲页面链表。
- `npages`：当前 freelist 中的空闲页面数量。
- `steal_hint`：记录上次窃取成功的位置，避免每次都从固定 CPU 开始搜索。

这里特别注意：

```c
__attribute__((aligned(64)))
```

将结构体本身按照 64 字节对齐，使每个数组元素的大小也会按照其对齐要求进行填充。

为什么需要这样做？

因为缓存一致性通常以 Cache Line 为单位进行维护。假设两个 CPU 的锁刚好位于同一条缓存行：

```text
Cache Line
+-------------------+-------------------+
| CPU 0 的 lock     | CPU 1 的 lock     |
+-------------------+-------------------+
```

虽然两个 CPU 操作的是不同的锁，但一个 CPU 修改锁所在的缓存行，仍可能导致另一个 CPU 的缓存副本失效。

这种现象称为**伪共享（False Sharing）**。

通过让每个 CPU 的数据结构独占缓存行，可以减少这种不必要的缓存一致性流量。

这里的 64 字节是常见缓存行大小的选择，实际系统应以目标硬件的缓存行大小为准。

另外，`npages` 在偷取过程中会被无锁读取，因此它的所有并发访问也需要使用原子操作。下面的实现会使用 `__ATOMIC_RELAXED`。

### 2.3 初始化：kinit() 和 freerange()

初始化时，需要为每个 CPU 初始化自己的 freelist：

```c
void
kinit(void)
{
  for (int i = 0; i < NCPU; i++) {
    initlock(&kmem[i].lock, "kmem");
    kmem[i].freelist = 0;
    __atomic_store_n(&kmem[i].npages, 0, __ATOMIC_RELAXED);
    steal_hint[i] = (i + 1) % NCPU;
  }

  freerange(end, (void *)PHYSTOP);
}
```

原来的 `freerange()` 将所有页面放入同一个 freelist。现在需要将页面分配给不同 CPU：

```c
// 将一页挂到 cid 号 CPU 的链表头上。
static void
free_to(int cid, struct run *r)
{
  acquire(&kmem[cid].lock);

  r->next = kmem[cid].freelist;
  kmem[cid].freelist = r;
  __atomic_fetch_add(&kmem[cid].npages, 1, __ATOMIC_RELAXED);

  release(&kmem[cid].lock);
}

void
freerange(void *pa_start, void *pa_end)
{
  char *p;
  int i = 0;

  p = (char *)PGROUNDUP((uint64)pa_start);

  // 将空闲页面轮流分配给不同 CPU。
  for (; p + PGSIZE <= (char *)pa_end; p += PGSIZE) {
    struct run *r = (struct run *)p;
    r->next = 0;

    free_to(i, r);
    i = (i + 1) % NCPU;
  }
}
```

这里采用轮转分配：

```c
i = (i + 1) % NCPU;
```

这样可以让所有 CPU 在初始化时获得相对均衡的空闲页面数量，避免某个 CPU 一开始就拥有全部页面。

### 2.4 kfree()：释放到本地 freelist

`kfree()` 的主要逻辑不需要改变，只需要将页面释放到当前 CPU 对应的 freelist：

```c
void
kfree(void *pa)
{
  push_off();
  int cid = cpuid();

  if (((uint64)pa % PGSIZE) != 0 ||
      (char *)pa < end ||
      (uint64)pa >= PHYSTOP)
    panic("kfree");

  // Fill with junk to catch dangling refs.
  memset(pa, 1, PGSIZE);

  free_to(cid, (struct run *)pa);

  pop_off();
}
```

这里的 `push_off()` 很重要。

它会关闭当前 CPU 的中断，防止执行过程中发生 CPU 迁移，使 `cpuid()` 得到的 CPU 编号在整个操作期间保持稳定。

页面始终释放到当前 CPU 的 freelist，不需要访问其他 CPU 的链表。

### 2.5 kalloc()：本地优先，失败后窃取

`kalloc()` 是整个改造的重点。

其流程如下：

1. 首先尝试从当前 CPU 的 freelist 分配页面。
2. 如果本地 freelist 为空，则调用 `steal()`。
3. 如果窃取成功，返回页面；否则返回空指针。

```c
void *
kalloc(void)
{
  struct run *r;
  int cid;

  push_off();
  cid = cpuid();

  // 快路径：优先从本地 freelist 分配。
  acquire(&kmem[cid].lock);

  r = kmem[cid].freelist;

  if (r) {
    kmem[cid].freelist = r->next;
    __atomic_fetch_sub(&kmem[cid].npages, 1, __ATOMIC_RELAXED);
    r->next = 0;
  }

  release(&kmem[cid].lock);

  // 本地没有空闲页面，再尝试窃取。
  if (r == 0)
    r = steal(cid);

  pop_off();

  if (r)
    memset((char *)r, 5, PGSIZE);

  return (void *)r;
}
```

这里将本地分配作为快路径（Fast Path），只有本地内存不足时才进入慢路径（Slow Path）。

这种设计可以让绝大多数分配操作只需要竞争本地锁。

### 2.6 Stealing：从其他 CPU 窃取页面

窃取操作的基本思想是：

当当前 CPU 的 freelist 为空时，尝试从其他 CPU 的 freelist 中取出一个页面。

为了避免总是从固定 CPU 窃取，引入 `steal_hint`：

```c
static struct run *
steal(int cid)
{
  int start = steal_hint[cid];

  // 第一轮：优先访问看起来有空闲页面的 CPU。
  // 第二轮：遍历所有 CPU，确保不会因为提示值过期而漏掉页面。
  for (int pass = 0; pass < 2; pass++) {
    for (int i = 0; i < NCPU; i++) {
      int v = (start + i) % NCPU;
      struct run *r;

      if (v == cid)
        continue;

      // npages 是提示信息，允许读取到旧值。
      if (pass == 0 &&
          __atomic_load_n(&kmem[v].npages, __ATOMIC_RELAXED) == 0)
        continue;

      r = take_from(cid, v);

      if (r) {
        steal_hint[cid] = v;
        return r;
      }
    }
  }

  return 0;
}
```

这里有两个值得注意的设计。

**第一，为什么分两轮？**

第一轮只访问 `npages` 看起来不为零的 CPU。

但 `npages` 是无锁读取的提示值，可能已经过期。例如：

- 某个 CPU 的 `npages` 实际已经大于零，但当前 CPU 读取到了旧值 0。
- 第一轮就会跳过这个 CPU。

因此，第二轮必须遍历所有 CPU，避免因为提示值不准确而错误地认为整个系统已经没有空闲页面。

这里使用 `__ATOMIC_RELAXED` 是合理的，因为 `npages` 只用于优化搜索顺序，真正决定能否窃取页面的是受锁保护的 freelist。

**第二，为什么使用 steal_hint？**

如果每次都从 CPU 0 开始搜索，可能导致 CPU 0 被大量其他 CPU 同时访问，形成新的锁竞争热点。

通过记录上次窃取成功的位置，并从下一个搜索周期继续轮转，可以减少固定受害者带来的竞争。

### 2.7 take_from()：真正执行窃取

```c
static struct run *
take_from(int cid, int v)
{
  struct run *head;

  // 只获取受害者的锁。
  acquire(&kmem[v].lock);

  head = kmem[v].freelist;

  if (head) {
    kmem[v].freelist = head->next;
    __atomic_fetch_sub(&kmem[v].npages, 1, __ATOMIC_RELAXED);
    head->next = 0;
  }

  release(&kmem[v].lock);

  return head;
}
```

这里一次只窃取一个页面。

为什么不同时获取窃取者和受害者的两把锁？

因为一次只需要修改受害者的 freelist，完全没有必要获取自己的锁。

这样可以避免双锁操作带来的锁顺序问题，降低死锁风险。

## 3. Memory allocator 小结

改造前：

```text
CPU 0 ----\
CPU 1 -----+----> Global freelist + Global lock
CPU 2 -----+
CPU 3 ----/
```

改造后：

```text
CPU 0 ----> Local freelist 0
CPU 1 ----> Local freelist 1
CPU 2 ----> Local freelist 2
CPU 3 ----> Local freelist 3

本地没有页面时，才尝试从其他 CPU 窃取。
```

这次优化的核心并不是更换链表实现，而是重新设计共享数据的组织方式。

通过 Per-CPU freelist：

- 减少了全局锁竞争。
- 提高了本地内存分配的并发度。
- 通过 stealing 实现不同 CPU 之间的内存资源共享。
- 通过缓存行对齐减少伪共享。

这实际上是操作系统中非常常见的一种设计思想：**优先使用本地资源，必要时再访问全局资源。**

---

# 二、Read-write lock (hard)

## 1. 为什么需要读写锁？

在多核操作系统中，多个 CPU 可能同时访问同一份共享数据。为了保证数据一致性，我们通常需要使用锁来保护临界区。

最常见的是互斥自旋锁（Spinlock）：同一时刻只允许一个 CPU 持有锁，其他 CPU 必须等待。

但是，并不是所有临界区都需要独占访问。

例如，多个 CPU 同时查询一份共享数据。只要没有修改操作，这些读取操作完全可以并发执行。

如果仍然使用普通自旋锁：

```text
CPU 0：获取锁 -> 读取 -> 释放锁
CPU 1：等待   -> 获取锁 -> 读取 -> 释放锁
CPU 2：等待   -> 获取锁 -> 读取 -> 释放锁
```

即使所有操作都只是读取，仍然被强制串行化。

因此，我们引入读写锁（Read-Write Lock）。

读写锁允许两种访问模式：

- **读锁（Read Lock）**：多个读者可以同时持有锁。
- **写锁（Write Lock）**：写者必须独占锁，不能与其他读者或写者同时持有。

其基本规则：

| 当前状态 | 新读者 | 新写者 |
|---|---|---|
| 没有持有者 | 允许 | 允许竞争 |
| 存在读者 | 允许（无等待写者时） | 等待 |
| 存在写者 | 等待 | 等待 |
| 存在等待写者 | 等待 | 允许竞争 |

本实验实现的是一个简单的**写者优先读写自旋锁（Writer-preference RW Spinlock）**。

API 接口如下：

```c
void initrwlock(struct rwspinlock *);
void read_acquire(struct rwspinlock *);
void read_release(struct rwspinlock *);
void write_acquire(struct rwspinlock *);
void write_release(struct rwspinlock *);
```

## 2. 实现思路

### 2.1 数据结构设计

首先定义读写锁：

```c
struct rwspinlock {
  int readers;  // 当前持有读锁的读者数量
  int writers;  // 当前是否有写者持有锁
  int pending;  // 正在等待获取写锁的写者数量
};
```

三个变量分别承担不同职责：

- `readers`：记录当前有多少个读者正在访问共享数据。
- `writers`：表示是否有写者持有独占锁，取值为 0 或 1。
- `pending`：记录正在等待写锁的写者数量，用于阻止新读者进入。

其中，`pending` 是整个实现中比较关键的设计。

为什么需要它？

假设当前有一个读者持有读锁，此时一个写者到来，需要等待读者退出。

如果没有 `pending`，新的读者仍然可以不断获取读锁。只要读者持续到来，`readers` 就可能始终不为零，写者便无法获得锁。

这就是读者优先可能导致的写者饥饿问题。

引入 `pending` 后，写者到来时首先登记：

```c
pending++;
```

此后，新读者发现 `pending > 0`，就不再进入临界区。

这样，已有读者退出后，写者就有机会获得独占访问权。

### 2.2 读者获取锁：登记、检查与回滚

读者获取锁的基本流程：

1. 检查是否存在持有锁的写者。
2. 检查是否存在等待中的写者。
3. 增加读者计数。
4. 再次检查写者状态。
5. 如果发现竞争，则撤销读者计数并重试。

为什么需要两次检查？

考虑下面的竞争场景：

```text
Reader                         Writer
  |                               |
  | 检查 pending == 0             |
  |                               |
  |                         pending++
  |                               |
  | readers++                     |
  |                               |
  | 再次检查 pending               |
  |                               |
  | 发现 pending != 0             |
  | readers--                     |
  |                               |
  |                         等待 readers == 0
```

如果只在增加 `readers` 之前检查一次，就可能发生：

- 读者检查时没有等待中的写者。
- 写者随后宣布等待。
- 读者继续进入临界区。
- 写者与读者之间产生竞争。

因此，读者必须在登记之后再次检查。

如果检查失败，就回滚计数。

这里的核心思想是：

**先尝试登记，再验证条件；如果竞争导致条件不再成立，就撤销操作。**

这是一种很常见的并发编程模式。

### 2.3 写者获取锁：先登记，再等待

写者的流程相对简单：

1. 原子增加 `pending`，宣布自己正在等待。
2. 等待所有读者退出。
3. 通过 CAS 获取写者独占权。
4. 原子减少 `pending`，撤销等待状态。

其中，CAS（Compare-And-Swap）保证多个写者之间的互斥。

假设两个写者同时竞争：

```text
Writer 1                    Writer 2
   |                           |
   | pending++                 | pending++
   |                           |
   | readers == 0              | readers == 0
   |                           |
   | CAS(0 -> 1) 成功          | CAS(0 -> 1) 失败
   |                           |
   | 获得写锁                  | 继续等待
```

只有一个写者能够将 `writers` 从 0 修改为 1。

获得写锁后，当前写者可以减少 `pending`，因为此时 `writers == 1` 仍然会阻止读者进入。

## 3. 具体实现

这里使用 GCC 提供的 `__atomic` 内置函数实现原子操作。

为了先简化正确性验证，所有共享状态操作统一使用 `__ATOMIC_SEQ_CST`，即顺序一致性内存序。

### 3.1 初始化

```c
void
initrwlock(struct rwspinlock *rwlk)
{
  __atomic_store_n(&rwlk->readers, 0, __ATOMIC_SEQ_CST);
  __atomic_store_n(&rwlk->writers, 0, __ATOMIC_SEQ_CST);
  __atomic_store_n(&rwlk->pending, 0, __ATOMIC_SEQ_CST);
}
```

### 3.2 读者获取锁

```c
static void
read_acquire_inner(struct rwspinlock *rwlk)
{
  for (;;) {
    // 等待写者退出，并且没有等待中的写者
    while (__atomic_load_n(&rwlk->writers, __ATOMIC_SEQ_CST) != 0 ||
           __atomic_load_n(&rwlk->pending, __ATOMIC_SEQ_CST) != 0)
      ;

    // 登记一个读者
    __atomic_fetch_add(&rwlk->readers, 1, __ATOMIC_SEQ_CST);

    // 再次检查，防止登记过程中写者到来
    if (__atomic_load_n(&rwlk->writers, __ATOMIC_SEQ_CST) == 0 &&
        __atomic_load_n(&rwlk->pending, __ATOMIC_SEQ_CST) == 0)
      return;

    // 获取失败，撤销读者登记
    __atomic_fetch_sub(&rwlk->readers, 1, __ATOMIC_SEQ_CST);
  }
}
```

读者进入临界区前，需要完成两次检查。

第一次检查用于避免在已有写者或等待写者时进行无意义的登记。

第二次检查用于处理检查与登记之间发生的竞争。

如果第二次检查失败，就通过原子递减撤销登记。

### 3.3 读者释放锁

```c
static void
read_release_inner(struct rwspinlock *rwlk)
{
  __atomic_fetch_sub(&rwlk->readers, 1, __ATOMIC_SEQ_CST);
}
```

读者退出时，只需要将 `readers` 减一。

最后一个读者退出后，`readers == 0`，等待中的写者就可以继续竞争写锁。

### 3.4 写者获取锁

```c
static void
write_acquire_inner(struct rwspinlock *rwlk)
{
  // 宣布有写者等待，阻止新读者进入
  __atomic_fetch_add(&rwlk->pending, 1, __ATOMIC_SEQ_CST);

  // 等待所有现有读者退出
  while (__atomic_load_n(&rwlk->readers, __ATOMIC_SEQ_CST) != 0)
    ;

  // 通过 CAS 获取写者独占权
  int expected = 0;

  while (!__atomic_compare_exchange_n(
      &rwlk->writers,
      &expected,
      1,
      0,
      __ATOMIC_SEQ_CST,
      __ATOMIC_SEQ_CST)) {
    expected = 0;
  }

  // 已经获得写锁，撤销等待标记
  __atomic_fetch_sub(&rwlk->pending, 1, __ATOMIC_SEQ_CST);
}
```

这里最重要的是：

```c
__atomic_fetch_add(&rwlk->pending, 1, __ATOMIC_SEQ_CST);
```

写者首先宣布等待，之后才等待现有读者退出。

这样可以避免新的读者持续进入，导致写者长期无法获得锁。

多个写者之间则通过 CAS 竞争 `writers`，保证同一时刻只有一个写者能够持有锁。

### 3.5 写者释放锁

```c
static void
write_release_inner(struct rwspinlock *rwlk)
{
  __atomic_store_n(&rwlk->writers, 0, __ATOMIC_SEQ_CST);
}
```

写者释放锁时，将 `writers` 设置为 0。

由于这里使用顺序一致性原子存储，写者在临界区中的操作能够通过相应的同步关系发布给后续成功获取锁的访问者。

实际使用时，还需要通过外层 API 确保调用者严格遵循获取和释放协议。

## 4. 正确性分析

读写锁最重要的性质是：

**任何时候，都不能出现读者和写者同时进入临界区的情况，也不能出现两个写者同时进入临界区的情况。**

可以从两个竞争场景理解。

### 4.1 写者先宣布等待

假设读者正在尝试获取读锁，写者先执行：

```c
pending++;
```

此时读者可能已经完成第一次检查，但还没有增加 `readers`。

读者增加计数后进行第二次检查，发现 `pending != 0`，于是撤销登记：

```c
readers--;
```

写者等待：

```c
while (readers != 0)
  ;
```

直到所有读者退出后，才能获得写锁。

因此，新读者不会越过已经宣布等待的写者。

### 4.2 读者先完成获取

另一种情况是读者先完成登记和第二次检查：

```text
Reader                         Writer
  |                               |
  | readers++                     |
  |                               |
  | 检查 writers == 0             |
  | 检查 pending == 0              |
  |                               |
  | 成功获取读锁                  |
  |                               |
  |                         pending++
  |                         等待 readers == 0
  |                               |
  | readers--                     |
  |                               |
  |                         获得写锁
```

读者在写者宣布等待之前已经成功获取读锁。

此时写者必须等待读者退出，不能直接进入临界区。

因此，读者与写者之间不会发生重叠访问。

上述推理依赖所有共享状态操作处于一致的顺序一致性模型中。不能只依靠源码中的执行顺序进行推理，还需要考虑编译器和处理器的内存重排序。

## 5. 设计权衡

读写锁不是普通自旋锁的无条件升级。它提高了读并发度，但也引入了额外的复杂性。

### 5.1 写者优先与读者饥饿

本实现通过 `pending` 阻止新读者进入，避免持续到来的读者让写者长期等待。

但它也有代价：如果写者持续到来，读者可能长期无法获取锁。

此外，多个写者之间通过 CAS 竞争，没有 FIFO 排队保证，因此也不能保证严格公平。

### 5.2 自旋等待与 CPU 开销

当前实现使用：

```c
while (condition)
  ;
```

这属于忙等待（Busy Waiting）。

等待期间 CPU 不会休眠，而是持续检查条件。

对于 xv6 这样的教学操作系统，自旋锁适合保护短临界区。但如果临界区很长，或者竞争非常激烈，忙等待会浪费 CPU 资源。

这也是读写信号量（Read-Write Semaphore）与读写自旋锁的重要区别：前者可以让等待者睡眠，而后者通常持续自旋。

### 5.3 读者计数器的缓存竞争

虽然多个读者能够并发执行，但每个读者进入和退出时都需要修改同一个 `readers` 变量。

在多核系统中，这会引发缓存一致性流量。

因此，读写锁并不一定比普通自旋锁更快。只有当读操作足够频繁、临界区足够短且读写比例合适时，读写锁才可能带来明显收益。

## 6. 实验结果

完成实现后，运行实验测试：

```text
== Test running kalloctest ==
$ make qemu-gdb
(37.9s)
== Test   kalloctest: test1 ==
  kalloctest: test1: OK
== Test   kalloctest: test2 == 
  kalloctest: test2: OK 
== Test   kalloctest: test3 ==
  kalloctest: test3: OK
== Test   kalloctest: test4 ==
  kalloctest: test4: OK
== Test kalloctest: sbrkmuch ==
$ make qemu-gdb
kalloctest: sbrkmuch: OK (2.9s)
== Test running rwlktest ==
$ make qemu-gdb
(3.9s)
== Test   rwlktest ==
  rwlktest: OK
== Test usertests ==
$ make qemu-gdb
usertests: OK (41.4s)
== Test time ==
time: OK
Score: 100/100
```

所有测试均通过，最终获得 100/100。

需要注意，测试通过说明实现满足了实验测试所覆盖的功能和并发场景，但并不等于已经证明算法在所有可能的执行交错下都正确。

---

# 三、总结

这次 xv6 锁实验实际上涉及两个不同层次的并发优化问题。

**Memory allocator：减少不必要的共享。**

原来的物理内存分配器使用一个全局 freelist，导致所有 CPU 必须竞争同一把锁。通过 Per-CPU freelist，将全局共享状态拆分为多个局部状态，再利用 stealing 实现资源共享，从而减少锁竞争。

**Read-write lock：减少不必要的互斥。**

普通自旋锁不区分读写操作，所有访问都必须串行执行。读写锁允许多个读者并发访问，同时通过写者优先策略保证写者最终有机会获得独占访问权。

两者背后的共同思想是：

**并发优化不只是让锁变得更快，更重要的是重新审视哪些操作真的需要互斥，哪些共享状态可以被拆分，以及如何在减少同步开销的同时维持正确性。**

从 xv6 的这两个实验出发，可以进一步研究 Linux 内核中的 per-CPU allocator、per-CPU variable、`rwlock_t` 和 `rwsem`，理解成熟操作系统如何在性能、公平性和实现复杂度之间做出权衡。