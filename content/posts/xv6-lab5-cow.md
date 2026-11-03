---
title: "MIT6.1810: Lab5 COW"
date: '2026-11-03T21:10:44+08:00'
draft: false
tags: [MIT6.1810, xv6, cow-fork]
categories: [操作系统]
---

# 一、fork 的实现原理

在用户态调用 `fork()` 后，程序通过系统调用进入内核，最终执行 `sys_fork()`，并在其中调用 `kfork()` 创建子进程。

`kfork()` 的主要工作包括：

- 调用 `allocproc()` 分配一个新的进程结构体，并完成必要的初始化。
- 调用 `uvmcopy()` 将父进程的用户地址空间复制到子进程。
- 将父进程的 Trapframe 拷贝到子进程，使子进程拥有与父进程相同的寄存器上下文。
- 遍历父进程打开的文件描述符，在子进程中通过 `filedup()` 增加对应文件对象的引用计数。
- 设置子进程的父进程信息，并将其状态设置为 `RUNNABLE`。

这里有一个比较巧妙的细节：

```c
// Cause fork to return 0 in the child.
np->trapframe->a0 = 0;
```

为什么需要单独修改子进程 Trapframe 中的 `a0`？

在 RISC-V 调用约定中，`a0` 用于传递函数参数和返回值。系统调用返回时，内核会将 Trapframe 中保存的 `a0` 恢复到用户态寄存器中。

因此：

- 父进程继续执行 `fork()` 后面的代码，系统调用返回值是子进程的 PID。
- 子进程第一次被调度时，从保存的上下文继续执行，系统调用返回值是 0。

这样，父子进程就能够通过 `fork()` 的返回值判断自己所处的执行分支。

下面是 `kfork()` 的核心实现（省略了部分与本实验无关的代码）：

```c
int
kfork(void)
{
  int i, pid;
  struct proc *np;
  struct proc *p = myproc();

  // Allocate process.
  if ((np = allocproc()) == 0)
    return -1;

  // Copy user memory from parent to child.
  if (uvmcopy(p->pagetable, np->pagetable, p->sz) < 0) {
    freeproc(np);
    release(&np->lock);
    return -1;
  }
  np->sz = p->sz;

  // Copy saved user registers.
  *(np->trapframe) = *(p->trapframe);

  // Cause fork to return 0 in the child.
  np->trapframe->a0 = 0;

  // Duplicate open file descriptors.
  for (i = 0; i < NOFILE; i++)
    if (p->ofile[i])
      np->ofile[i] = filedup(p->ofile[i]);

  np->cwd = idup(p->cwd);
  safestrcpy(np->name, p->name, sizeof(p->name));

  pid = np->pid;

  release(&np->lock);

  acquire(&wait_lock);
  np->parent = p;
  release(&wait_lock);

  acquire(&np->lock);
  np->state = RUNNABLE;
  release(&np->lock);

  return pid;
}
```

这里最值得关注的是 `uvmcopy()`。

在传统的 xv6 实现中，`uvmcopy()` 会遍历父进程的用户地址空间，以页为单位为子进程分配物理页面，并将父进程对应页面的内容复制过去。

```c
int
uvmcopy(pagetable_t old, pagetable_t new, uint64 sz)
{
  pte_t *pte;
  uint64 pa, i;
  uint flags;
  char *mem;

  // Iterate over the parent's address space page by page.
  for (i = 0; i < sz; i += PGSIZE) {
    if ((pte = walk(old, i, 0)) == 0)
      continue;

    if ((*pte & PTE_V) == 0)
      continue;

    pa = PTE2PA(*pte);
    flags = PTE_FLAGS(*pte);

    if ((mem = kalloc()) == 0)
      goto err;

    memmove(mem, (char *)pa, PGSIZE);

    if (mappages(new, i, PGSIZE, (uint64)mem, flags) != 0) {
      kfree(mem);
      goto err;
    }
  }

  return 0;

err:
  uvmunmap(new, 0, i / PGSIZE, 1);
  return -1;
}
```

可以看到，传统的 `uvmcopy()` 本质上做了两件事：

1. **复制物理页面**：为子进程分配新的物理页面，并复制父进程页面中的内容。
2. **建立页表映射**：通过 `mappages()` 将新分配的物理页面映射到子进程的虚拟地址空间。

因此，传统的 `fork()` 不仅需要创建子进程，还需要复制父进程的大量内存数据。

> **关键点：传统 fork 会为子进程复制父进程的用户内存页面，而不仅仅是复制进程控制结构和寄存器上下文。**

# 二、传统 fork 方案存在的问题

传统 `fork()` 最大的问题是：**它总是复制父进程的整个用户地址空间，但子进程未必真的需要这些数据。**

考虑一个非常常见的场景：我们在 shell 中输入一条命令，例如 `ls`。

shell 通常会先调用 `fork()` 创建子进程，然后在子进程中调用 `exec()`，启动真正需要执行的程序。

那么，`exec()` 究竟做了什么？

首先，用户态通过系统调用将目标程序的路径和参数传递给内核。内核中的 `sys_exec()` 会解析这些参数，随后调用 `kexec()`：

```c
uint64
sys_exec(void)
{
  char path[MAXPATH], *argv[MAXARG];
  int i;
  uint64 uargv, uarg;

  argaddr(1, &uargv);
  if (argstr(0, path, MAXPATH) < 0)
    return -1;

  memset(argv, 0, sizeof(argv));

  for (i = 0;; i++) {
    if (i >= NELEM(argv))
      goto bad;

    if (fetchaddr(uargv + sizeof(uint64) * i,
                  (uint64 *)&uarg) < 0)
      goto bad;

    if (uarg == 0) {
      argv[i] = 0;
      break;
    }

    argv[i] = kalloc();
    if (argv[i] == 0)
      goto bad;

    if (fetchstr(uarg, argv[i], PGSIZE) < 0)
      goto bad;
  }

  int ret = kexec(path, argv);

  for (i = 0; i < NELEM(argv) && argv[i] != 0; i++)
    kfree(argv[i]);

  return ret;

bad:
  for (i = 0; i < NELEM(argv) && argv[i] != 0; i++)
    kfree(argv[i]);

  return -1;
}
```

继续跟踪 `kexec()`，可以发现它主要完成以下工作：

1. 根据传入的 `path` 打开目标可执行文件。
2. 读取 ELF Header，并检查 ELF Magic Number，确认文件是否为合法的 ELF 文件。
3. 调用 `proc_pagetable()` 创建一个新的页表。
4. 遍历 ELF Program Header Table，找到需要加载的 `PT_LOAD` 类型的 Segment。
5. 为每个需要加载的 Segment 分配物理内存，并将其映射到新页表中。
6. 从 ELF 文件中读取对应的数据，加载到新分配的物理页面中。
7. 为新程序创建用户栈，复制命令行参数。
8. 最后切换到新的页表和程序入口地址，并释放旧的用户地址空间。

这里需要注意一个 ELF 文件格式的细节：`Program Header` 描述的是程序运行时需要加载的 Segment，而不是 ELF 文件中的 Section。对于操作系统加载程序而言，真正重要的是这些可加载的 Segment。

`kexec()` 中最关键的操作是：

```c
// Commit to the user image.
oldpagetable = p->pagetable;
p->pagetable = pagetable;
p->sz = sz;
p->trapframe->epc = elf.entry;
p->trapframe->sp = sp;

proc_freepagetable(oldpagetable, oldsz);
```

它创建了一个全新的用户地址空间，然后将进程的页表切换到新地址空间，最后释放旧地址空间。

这就产生了一个值得思考的问题：

当 shell 调用 `fork()` 创建子进程后，子进程马上调用 `exec()`，那么刚刚在 `fork()` 中复制的父进程内存，实际上很快就会被释放掉。

也就是说：

- `fork()` 花费了大量时间和内存资源，复制父进程的地址空间。
- `exec()` 随后又释放了这些刚刚复制过来的页面。
- 整个过程中，这些页面可能从未被子进程真正访问过。

> **关键发现：在 fork + exec 的典型使用场景中，传统 fork 对整个用户地址空间的复制可能是一笔完全没有必要的开销。**

那么，有没有一种方法，可以先不复制父进程的物理页面，等到父子进程真正需要修改页面时，再进行复制？

这就是 **Copy-On-Write（COW，写时复制）**。

需要强调的是，COW 并不是虚拟内存本身的意义，而是利用虚拟内存、页表权限和缺页异常实现的一种内存管理优化。

# 三、实现 COW Fork

## 1. COW Fork 的核心思路

COW 的核心思想非常简单：

**fork 时不立即复制物理页面，而是让父子进程暂时共享同一份物理页面；只有当某个进程尝试修改共享页面时，才为它创建独立的副本。**

具体来说，传统 `fork()` 和 COW `fork()` 的区别如下：

| 操作 | 传统 fork | COW fork |
|---|---|---|
| 创建子进程 | 分配进程结构 | 分配进程结构 |
| 创建子进程页表 | 为页面建立映射 | 为共享页面建立映射 |
| 复制物理页面 | 立即复制 | 暂不复制 |
| 父子进程读页面 | 访问各自页面 | 共享同一物理页面 |
| 父子进程写页面 | 直接修改各自页面 | 触发缺页异常，再复制 |
| 释放物理页面 | 直接释放 | 根据引用计数决定是否释放 |

为了实现这一机制，我们需要解决三个问题：

1. **如何知道一个物理页面是否被多个进程共享？**
   - 为物理页面引入引用计数。
2. **如何识别一个页面是否属于 COW 页面？**
   - 使用页表项中的软件保留位标记 COW 页面。
3. **进程尝试写入 COW 页面时，如何完成复制？**
   - 利用写缺页异常，在 `vmfault()` 中处理 COW。

下面逐步实现。

## 2. 为物理页面引入引用计数

在 COW Fork 中，父子进程可能共享同一个物理页面。

假设父进程和子进程都映射了物理页面 A：

```text
Parent Page Table                 Child Page Table
+------------------+              +------------------+
| VA 0x1000        |              | VA 0x1000        |
|                  |              |                  |
|       +----------+--------------+----------+       |
|       |          Physical Page A          |       |
|       +-----------------------------------+       |
+------------------+              +------------------+
```

此时，如果子进程退出，它不能直接释放物理页面 A，因为父进程仍然需要访问这个页面。

因此，我们需要为每个物理页面维护一个引用计数：

- 分配物理页面时，引用计数初始化为 1。
- 新增一个页表映射时，引用计数加 1。
- 删除一个页表映射时，引用计数减 1。
- 只有引用计数变为 0 时，才能真正释放物理页面。

修改 `kernel/kalloc.c`，增加引用计数管理：

```c
// kernel/kalloc.c

#define PA2IDX(pa) ((uint64)(pa) / PGSIZE)

struct cowref {
  struct spinlock lock;
  int ref_cnt[PHYSTOP / PGSIZE];
} refcount;
```

这里使用物理地址除以页面大小，得到物理页面在引用计数数组中的索引。

首先实现增加引用计数和查询引用计数的函数：

```c
void
krefinc(uint64 pa)
{
  acquire(&refcount.lock);

  if (refcount.ref_cnt[PA2IDX(pa)] < 1)
    panic("krefinc");

  refcount.ref_cnt[PA2IDX(pa)]++;

  release(&refcount.lock);
}

int
krefcnt(uint64 pa)
{
  int count;

  acquire(&refcount.lock);
  count = refcount.ref_cnt[PA2IDX(pa)];
  release(&refcount.lock);

  return count;
}
```

接下来修改 `kalloc()`。

每次分配物理页面时，都需要将它的引用计数设置为 1：

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

  if (r) {
    memset((char *)r, 5, PGSIZE);

    acquire(&refcount.lock);
    refcount.ref_cnt[PA2IDX(r)] = 1;
    release(&refcount.lock);
  }

  return (void *)r;
}
```

最后修改 `kfree()`。

注意：这里不能简单地在不同的临界区中分别读取、递减和检查引用计数，否则多个 CPU 并发操作同一个页面时，可能出现竞态条件。

应该在同一个临界区内完成引用计数递减和检查：

```c
void
kfree(void *pa)
{
  struct run *r;
  int idx;

  if (((uint64)pa % PGSIZE) != 0 ||
      (char *)pa < end ||
      (uint64)pa >= PHYSTOP)
    panic("kfree");

  idx = PA2IDX(pa);

  acquire(&refcount.lock);

  if (refcount.ref_cnt[idx] < 1)
    panic("kfree: refcnt");

  refcount.ref_cnt[idx]--;

  if (refcount.ref_cnt[idx] > 0) {
    release(&refcount.lock);
    return;
  }

  release(&refcount.lock);

  // Fill with junk to catch dangling references.
  memset(pa, 1, PGSIZE);

  r = (struct run *)pa;

  acquire(&kmem.lock);
  r->next = kmem.freelist;
  kmem.freelist = r;
  release(&kmem.lock);
}
```

这里有一个容易忽略的初始化问题：`freerange()` 在系统初始化时会将所有可用物理页面加入空闲链表，而这些页面此时的引用计数尚未初始化。

因此，需要保证初始化阶段调用 `kfree()` 前，对应页面的引用计数已经设置为 1。这样 `kfree()` 执行递减后，引用计数变为 0，页面才能正常加入空闲链表。

例如，可以在 `freerange()` 中完成初始化：

```c
void
freerange(void *pa_start, void *pa_end)
{
  char *p;

  p = (char *)PGROUNDUP((uint64)pa_start);

  for (; p + PGSIZE <= (char *)pa_end; p += PGSIZE) {
    acquire(&refcount.lock);
    refcount.ref_cnt[PA2IDX(p)] = 1;
    release(&refcount.lock);

    kfree(p);
  }
}
```

同时，`kinit()` 必须先初始化引用计数锁，再调用 `freerange()`：

```c
void
kinit(void)
{
  initlock(&kmem.lock, "kmem");
  initlock(&refcount.lock, "refcount");

  freerange(end, (void *)PHYSTOP);
}
```

最后，在 `kernel/defs.h` 中声明：

```c
void krefinc(uint64 pa);
int krefcnt(uint64 pa);
```

至此，我们就完成了物理页面引用计数的基本管理。

## 3. 使用 PTE_COW 标记 COW 页面

RISC-V 页表项（PTE）除了保存物理页面地址和访问权限之外，还保留了一部分供软件使用的位。

在 xv6 的 RISC-V 实现中，我们可以使用 RSW（Reserved for Supervisor Software）区域中的一个位来标记 COW 页面。

在 `kernel/riscv.h` 中添加：

```c
#define PTE_COW (1L << 8)
```

这样，我们就可以通过 `PTE_COW` 判断一个页面是否处于 COW 状态。

需要注意：**并不是所有只读页面都是 COW 页面。**

例如，程序的代码段通常是只读的。即使父子进程共享这些页面，也不应该允许它们通过写缺页异常获得写权限。

因此，在 `uvmcopy()` 中，只有原本具有 `PTE_W` 权限的页面才需要被标记为 COW。

## 4. 修改 uvmcopy()：让父子进程共享物理页面

现在回到 `uvmcopy()`。

传统实现会为子进程分配新的物理页面，并复制父进程页面中的内容。

COW 实现则完全不同：

1. 遍历父进程的页表，找到有效的页面映射。
2. 获取当前页面的物理地址和 PTE 权限。
3. 如果页面原本可写，则清除 `PTE_W`，并设置 `PTE_COW`。
4. 增加物理页面的引用计数。
5. 将同一个物理页面映射到子进程的页表中。

修改后的实现如下：

```c
int
uvmcopy(pagetable_t old, pagetable_t new, uint64 sz)
{
  pte_t *pte;
  uint64 pa, i;
  uint flags;

  for (i = 0; i < sz; i += PGSIZE) {
    if ((pte = walk(old, i, 0)) == 0)
      continue;

    if ((*pte & PTE_V) == 0)
      continue;

    pa = PTE2PA(*pte);
    flags = PTE_FLAGS(*pte);

    // Only originally writable pages become COW.
    if (flags & PTE_W) {
      flags = (flags & ~PTE_W) | PTE_COW;
      *pte = PA2PTE(pa) | flags;
    }

    // The child now holds another reference to this page.
    krefinc(pa);

    if (mappages(new, i, PGSIZE, pa, flags) != 0) {
      kfree((void *)pa);
      goto err;
    }
  }

  sfence_vma();
  return 0;

err:
  uvmunmap(new, 0, i / PGSIZE, 1);
  sfence_vma();
  return -1;
}
```

这里有几个值得特别关注的细节。

**第一，修改的是父进程自己的 PTE。**

```c
*pte = PA2PTE(pa) | flags;
```

我们不仅需要让子进程的页面变成只读 COW 页面，还需要让父进程的页面变成只读 COW 页面。

否则，父进程仍然能够直接写入共享物理页面，破坏 COW 的隔离语义。

**第二，为什么只有原本可写的页面才设置 PTE_COW？**

假设某个页面原本只有 `PTE_R` 权限，没有 `PTE_W` 权限。

那么它可能是程序的代码段。父子进程共享该页面是安全的，因为它们都只能读取，不能修改。

如果将它也标记为 COW，那么进程写入代码段时，内核就可能错误地为其分配一个可写副本，破坏原本的只读权限。

**第三，为什么需要增加引用计数？**

父进程和子进程现在共享同一个物理页面，因此需要将引用计数增加 1。

此外，`mappages()` 失败时，需要撤销刚刚增加的引用计数；随后错误清理还需要释放此前已经成功映射到子进程页表中的页面。

实际实现时，还需要确认错误清理路径能够正确处理 Lazy Allocation 留下的页表空洞。如果当前 `uvmunmap()` 对无效 PTE 会直接 panic，就需要调整清理逻辑，使其跳过未映射页面。

**第四，为什么需要 sfence_vma()？**

修改 PTE 并不意味着 CPU 中的 TLB 会自动失效。

父进程之前可能已经缓存了该页面的可写映射。现在我们撤销了 `PTE_W`，必须刷新相应的地址转换缓存，确保后续写操作能够触发 Store Page Fault。

这里使用 `sfence_vma()` 刷新当前 hart 的地址转换缓存。

## 5. 修改 vmfault()：处理 COW 缺页异常

完成 `uvmcopy()` 后，父子进程已经共享物理页面，而且对应 PTE 都被设置成只读。

那么，当其中一个进程尝试写入共享页面时，会发生什么？

以父进程为例：

```c
*addr = 100;
```

由于当前页面的 PTE 没有 `PTE_W` 权限，CPU 不允许直接写入该页面，于是触发 Store Page Fault。

RISC-V 中与本实验相关的异常原因包括：

| scause | 含义 |
|---|---|
| 13 | Load Page Fault |
| 15 | Store/AMO Page Fault |

xv6 会在 `usertrap()` 中捕获这个异常，并调用 `vmfault()` 处理。

COW 的处理逻辑可以概括为：

1. 检查发生缺页异常的页面是否为有效的 COW 页面。
2. 获取该页面对应的物理地址和 PTE 权限。
3. 如果页面只有一个引用者，说明其他进程已经不再共享该页面，可以直接恢复写权限。
4. 如果页面仍然被多个进程共享，就分配一个新的物理页面。
5. 将旧页面的内容复制到新页面。
6. 修改当前进程的 PTE，让它指向新页面，并恢复写权限。
7. 减少旧页面的引用计数。

这里还有一个值得注意的优化：

如果物理页面的引用计数已经变成 1，那么实际上没有必要再复制页面。因为当前进程已经是这个页面唯一的持有者，只需要恢复写权限即可。

修改 `vmfault()`，在原有 Lazy Allocation 逻辑之前增加 COW 处理：

```c
uint64
vmfault(pagetable_t pagetable, uint64 psz, uint64 va, int read)
{
  uint64 mem;
  uint64 pa;
  pte_t *pte;
  uint flags;

  if (va >= MAXVA || va >= psz)
    return 0;

  va = PGROUNDDOWN(va);

  pte = walk(pagetable, va, 0);

  // Case 1: COW page fault.
  if (pte != 0 &&
      (*pte & PTE_V) &&
      (*pte & PTE_COW)) {

    // COW is resolved only for write accesses.
    if (read || !(*pte & PTE_U))
      return 0;

    pa = PTE2PA(*pte);
    flags = PTE_FLAGS(*pte);

    // Only one reference remains: no need to copy.
    if (krefcnt(pa) == 1) {
      *pte = PA2PTE(pa) |
             ((flags | PTE_W) & ~PTE_COW);

      sfence_vma();
      return pa;
    }

    // Allocate a new physical page.
    mem = (uint64)kalloc();
    if (mem == 0)
      return 0;

    // Copy the old page.
    memmove((void *)mem, (void *)pa, PGSIZE);

    // Replace the PTE with the new physical page.
    *pte = PA2PTE(mem) |
           ((flags | PTE_W) & ~PTE_COW);

    // Drop the reference to the old physical page.
    kfree((void *)pa);

    sfence_vma();

    return mem;
  }

  // Case 2: Already mapped, but not a valid COW fault.
  if (ismapped(pagetable, va))
    return 0;

  // Case 3: Lazy allocation.
  mem = (uint64)kalloc();
  if (mem == 0)
    return 0;

  memset((void *)mem, 0, PGSIZE);

  if (mappages(pagetable, va, PGSIZE, mem,
               PTE_W | PTE_U | PTE_R) != 0) {
    kfree((void *)mem);
    return 0;
  }

  return mem;
}
```

这里需要理解几个关键点。

**第一，为什么要在 `ismapped()` 之前处理 COW？**

因为 COW 页面本身就是一个有效的页面映射。

它具有 `PTE_V`，只不过没有 `PTE_W`。如果先调用 `ismapped()`，就会将它当成一个已经映射的普通页面，直接拒绝处理。

因此，必须先识别 COW 页面，再处理其他情况。

**第二，为什么需要判断 `read`？**

当前 `vmfault()` 的最后一个参数 `read` 用于区分读访问和写访问：

- `read == 1`：读访问。
- `read == 0`：写访问。

COW 的核心是处理写操作。读操作本来就可以直接访问共享页面，不需要复制。

正常情况下，COW 页面是可读的，因此对它的读操作不会触发缺页异常。这里的判断主要是避免错误地将不符合预期的异常当成 COW 写缺页处理。

**第三，为什么需要保留原来的 PTE 权限？**

```c
*pte = PA2PTE(mem) |
       ((flags | PTE_W) & ~PTE_COW);
```

我们只恢复 `PTE_W`，并清除 `PTE_COW`，其他权限保持不变。

这样既能够让当前进程写入自己的页面，也不会意外改变页面原有的用户访问权限等属性。

**第四，为什么还要调用 `kfree()`？**

当当前进程获得新的物理页面后，它不再使用原来的共享页面，因此需要减少旧页面的引用计数。

如果还有其他进程在使用旧页面，`kfree()` 只会减少引用计数，不会真正释放页面。

如果这是最后一个引用，页面才会被放回物理内存空闲链表。

## 6. 修改 copyout()：不要遗漏内核态写入

实现 COW 时，还有一个很容易被忽略的函数：`copyout()`。

它的作用是将内核地址空间中的数据复制到用户地址空间中。

例如，系统调用需要将内核中的数据写入用户缓冲区，就可能调用 `copyout()`。

这意味着：**即使用户进程没有直接执行写指令，内核也可能替它修改用户地址空间中的内容。**

传统的 `copyout()` 大致会：

1. 通过 `walkaddr()` 获取目标虚拟地址对应的物理地址。
2. 检查目标页面是否具有用户访问权限和写权限。
3. 使用 `memmove()` 将数据复制到目标物理页面。

但是，COW 页面虽然不能被用户态直接写入，却仍然具有有效的物理地址和用户访问权限。

因此，`walkaddr()` 可能成功返回物理地址，但目标页面实际上仍然是只读的 COW 页面。

如果不先处理 COW，内核就可能直接拒绝这次写入，导致 `copyout()` 失败。

所以，我们必须在获取物理地址之前检查目标页面是否为 COW 页面。如果是，就先调用 `vmfault()` 完成写时复制。

修改后的 `copyout()`：

```c
int
copyout(pagetable_t pagetable, uint64 psz,
        uint64 dstva, char *src, uint64 len)
{
  uint64 n, va0, pa0;
  pte_t *pte;

  while (len > 0) {
    va0 = PGROUNDDOWN(dstva);

    if (va0 >= MAXVA)
      return -1;

    pte = walk(pagetable, va0, 0);

    // Case 1: COW page.
    // Resolve COW before accessing the physical page.
    if (pte != 0 &&
        (*pte & PTE_V) &&
        (*pte & PTE_COW)) {

      pa0 = vmfault(pagetable, psz, va0, 0);

      if (pa0 == 0)
        return -1;

    } else {
      // Case 2: Normal mapped page or lazy allocation.
      pa0 = walkaddr(pagetable, va0);

      if (pa0 == 0) {
        pa0 = vmfault(pagetable, psz, va0, 0);

        if (pa0 == 0)
          return -1;
      }
    }

    // Check user write permission.
    pte = walk(pagetable, va0, 0);

    if (pte == 0 ||
        (*pte & PTE_V) == 0 ||
        (*pte & PTE_U) == 0 ||
        (*pte & PTE_W) == 0)
      return -1;

    n = PGSIZE - (dstva - va0);

    if (n > len)
      n = len;

    memmove((void *)(pa0 + (dstva - va0)), src, n);

    len -= n;
    src += n;
    dstva = va0 + PGSIZE;
  }

  return 0;
}
```

这里的关键是：

```c
if (pte != 0 &&
    (*pte & PTE_V) &&
    (*pte & PTE_COW)) {
  pa0 = vmfault(pagetable, psz, va0, 0);
}
```

我们必须先判断 COW，再调用 `walkaddr()`。

这也说明了一个重要的设计原则：

**COW 不仅需要处理用户态触发的写缺页，还需要处理内核通过 `copyout()` 对用户地址空间进行的写入。**

## 7. 修改 usertrap()：统一处理 COW 和 Lazy Allocation

最后，修改 `kernel/trap.c` 中的 `usertrap()`。

在 xv6 中，用户态发生缺页异常后，CPU 会进入内核态，并由 `usertrap()` 处理异常。

我们已经在 `vmfault()` 中同时实现了 COW 和 Lazy Allocation，因此可以继续使用原有的缺页异常处理流程：

```c
else if (r_scause() == 15 || r_scause() == 13) {
  // Store/AMO or Load page fault.
  if (vmfault(p->pagetable, p->sz, r_stval(),
              r_scause() == 13) == 0) {
    setkilled(p);
  }
}
```

这里：

- `r_scause() == 15`：Store/AMO Page Fault，对应写访问，传入 `read = 0`。
- `r_scause() == 13`：Load Page Fault，对应读访问，传入 `read = 1`。
- `r_stval()`：保存发生异常的虚拟地址。

如果 `vmfault()` 成功处理异常，就返回对应的物理页面地址；如果返回 0，则说明无法处理该缺页异常，内核会将进程标记为 killed。

例如，进程尝试写入原本只读的代码段页面时，该页面没有 `PTE_COW` 标记，`vmfault()` 就会拒绝处理，最终杀死进程。

至此，COW Fork 的核心逻辑就已经实现了。

# 四、测试

完成上述修改后，运行 MIT 6.1810 提供的测试：

```bash
make qemu-gdb
```

测试结果：

```text
== Test running cowtest ==
$ make qemu-gdb
(28.8s)

== Test   simple ==
  simple: OK

== Test   three ==
  three: OK

== Test   file ==
  file: OK

== Test   forkfork ==
  forkfork: OK

== Test usertests ==
$ make qemu-gdb

== Test   usertests: copyin ==
  usertests: copyin: OK

== Test   usertests: copyout ==
  usertests: copyout: OK

== Test usertests: all tests ==
  usertests: all tests: OK

== Test time ==
time: OK

Score: 130/130
```

<badge color="success">130/130</badge>

所有测试通过。

# 五、总结：COW Fork 的完整执行流程

最后，我们把整个 COW Fork 的执行过程串起来。

假设父进程拥有一个可写的虚拟页面 VA，该页面映射到物理页面 A。

**第一步：调用 fork()**

父进程调用 `fork()`，内核执行 `uvmcopy()`。

此时并不会分配新的物理页面，而是：

- 父进程的 PTE 清除 `PTE_W`，设置 `PTE_COW`。
- 子进程的 PTE 指向相同的物理页面 A，同样设置 `PTE_COW`。
- 物理页面 A 的引用计数增加。

```text
Parent                         Child
+------------------+           +------------------+
| VA -> Page A     |           | VA -> Page A     |
| R/W removed      |           | R/W removed      |
| PTE_COW = 1      |           | PTE_COW = 1      |
+--------+---------+           +--------+---------+
         |                              |
         +--------------+---------------+
                        |
                 +------+------+
                 | Physical A  |
                 | Refcount=2  |
                 +-------------+
```

**第二步：父进程或子进程读取页面**

由于两个进程都拥有页面的读取权限，因此可以直接访问物理页面 A。

不需要触发缺页异常，也不需要复制物理页面。

**第三步：其中一个进程尝试写入页面**

假设父进程尝试写入 VA：

```c
*addr = 100;
```

由于父进程的 PTE 没有 `PTE_W`，CPU 触发 Store Page Fault。

内核进入 `usertrap()`，随后调用 `vmfault()`。

**第四步：处理 COW 缺页**

由于物理页面 A 的引用计数为 2，说明仍然有其他进程共享该页面。

因此，内核：

1. 分配新的物理页面 B。
2. 将页面 A 的内容复制到页面 B。
3. 修改父进程的 PTE，让 VA 指向页面 B。
4. 恢复父进程的写权限，清除 `PTE_COW`。
5. 调用 `kfree(A)`，将页面 A 的引用计数减 1。

最终：

```text
Parent                         Child
+------------------+           +------------------+
| VA -> Page B     |           | VA -> Page A     |
| PTE_W = 1        |           | PTE_COW = 1      |
| PTE_COW = 0      |           +--------+---------+
+--------+---------+                    |
         |                              |
  +------+-----+                 +------+-----+
  | Physical B |                 | Physical A |
  | Refcount=1 |                 | Refcount=1 |
  +------------+                 +------------+
```

现在，父进程可以独立修改页面 B，而子进程仍然访问原来的页面 A。

**第五步：释放页面**

当子进程退出时，内核遍历其页表，解除页面 A 的映射。

`kfree()` 将页面 A 的引用计数减为 0，此时才真正将页面 A 放回物理内存空闲链表。

至此，COW 的整个生命周期就完成了。

---

# 六、值得进一步思考的问题

COW Fork 虽然实现起来并不复杂，但它涉及操作系统中几个非常重要的设计思想：

1. **为什么页表权限可以参与内存管理？**

   COW 并没有引入新的硬件机制，而是利用现有的页表权限和异常机制，将普通的内存写操作转化为内核可以处理的缺页异常。

2. **为什么引用计数应该放在物理内存管理模块中？**

   因为物理页面可能被多个进程映射。页面是否能够释放，取决于所有映射的生命周期，而不是某一个进程的生命周期。

3. **为什么 COW 需要同时修改父进程和子进程的 PTE？**

   因为在 fork 完成后，父子进程都可能修改共享页面。只有同时撤销双方的写权限，才能保证任何一方写入时都进入内核处理。

4. **为什么 copyout() 也需要处理 COW？**

   因为内核不仅可以通过用户态指令访问用户内存，也可以直接通过物理地址修改用户页面。所有可能绕过用户态页表写权限的内核写入路径，都必须正确处理 COW。

5. **COW Fork 是否真的完全不复制页面？**

   不是。它只是推迟了复制。只要父子进程最终都需要修改同一个共享页面，就仍然需要分配新的物理页面并复制数据。

COW 的真正价值在于：**将原本无条件发生的内存复制，变成只有在确实需要修改共享数据时才发生的按需复制。**