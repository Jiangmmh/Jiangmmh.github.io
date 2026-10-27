---
title: "MIT6.1810: Lab3 Pagetable"
date: '2026-10-27T11:01:51+08:00'
draft: false
tags: [操作系统, xv6, 页表, 虚拟内存]
categories: [MIT6.1810]
---

# 一、**Inspect a user-process page table (easy)**·

xv6提供了一个用户程序pgtbltest.c，其中调用print_pgtbl()打印了页表的前10个页面和后10页的页表项，因为页表属于内核管理的数据结构，所以想要获取页表项就必须通过系统调用才行。在该lab中xv6额外提供了几个系统调用，其中的pgpte()的作用就是根据虚拟地址va，得到其对应的PTE。

```c
int ugetpid(void);
uint64 pgpte(void *);
void vmprint(void);
int pgaccess(void *base, int len, void *mask);
int ksupernpte(uint64*, uint64 *);
```

```c
void
print_pgtbl()
{
  printf("print_pgtbl starting\n");
  for (uint64 i = 0; i < 10; i++) {
    print_pte(i * PGSIZE);
  }
  uint64 top = MAXVA / PGSIZE;
  for (uint64 i = top - 10; i < top; i++) {
    print_pte(i * PGSIZE);
  }
  printf("print_pgtbl: OK\n");
}
```

启动xv6，运行程序pgtbltest打印页表：

```bash
xv6 kernel is booting

hart 1 starting
hart 2 starting
init: starting sh
$ pgtbltest
print_pgtbl starting
va 0x0 pte 0x21FC885B pa 0x87F22000 perm 0x5B
va 0x1000 pte 0x21FC7C17 pa 0x87F1F000 perm 0x17
va 0x2000 pte 0x21FC7807 pa 0x87F1E000 perm 0x7
va 0x3000 pte 0x21FC74D7 pa 0x87F1D000 perm 0xD7
va 0x4000 pte 0x0 pa 0x0 perm 0x0
va 0x5000 pte 0x0 pa 0x0 perm 0x0
va 0x6000 pte 0x0 pa 0x0 perm 0x0
va 0x7000 pte 0x0 pa 0x0 perm 0x0
va 0x8000 pte 0x0 pa 0x0 perm 0x0
va 0x9000 pte 0x0 pa 0x0 perm 0x0
va 0x3FFFFF6000 pte 0x0 pa 0x0 perm 0x0
va 0x3FFFFF7000 pte 0x0 pa 0x0 perm 0x0
va 0x3FFFFF8000 pte 0x0 pa 0x0 perm 0x0
va 0x3FFFFF9000 pte 0x0 pa 0x0 perm 0x0
va 0x3FFFFFA000 pte 0x0 pa 0x0 perm 0x0
va 0x3FFFFFB000 pte 0x0 pa 0x0 perm 0x0
va 0x3FFFFFC000 pte 0x0 pa 0x0 perm 0x0
va 0x3FFFFFD000 pte 0x0 pa 0x0 perm 0x0
va 0x3FFFFFE000 pte 0x21FD08C7 pa 0x87F42000 perm 0xC7
va 0x3FFFFFF000 pte 0x2000184B pa 0x80006000 perm 0x4B
print_pgtbl: OK
vmprint_test starting
vmprint_test: done
pgaccess_test starting
pgtbltest: pgaccess_test failed: incorrect access bits set, pid=3
```

这个页表和用户进程的地址空间正好能对应上：

![image.png](/images/posts/xv6-pgtbl/image.png)

# 二、**Walk and print a two-level page table (easy)**

要求按指定格式层次化地打印多级页表，我的思路是三层循环，遍历512 * 512 * 512个页表项，不断输出即可。不过还要考虑更多的情况：

- 如果某个页表项不存在，那么应当跳过
- 如果某个页表项的RWX权限不全为0，说明该PTE指向大页，无需打印下一层的页表项

```c
static void
printpte(pte_t *ppte, uint64 va, int level)
{
    if (!ppte) panic("printpte: NULL");

    pte_t pte = *ppte;

    // 每级前缀 " .."：level 2 → 1 个，level 1 → 2 个，level 0 → 3 个
    for (int i = 3 - level; i > 0; i--)
        printk(" ..");

    printk("%p: pte %p pa %p ",
       (void *)va, (void *)ppte, (void *)PTE2PA(pte));

    if (pte & PTE_R) printk("R");
    if (pte & PTE_W) printk("W");
    if (pte & PTE_X) printk("X");
    if (pte & PTE_U) printk("U");
    printk("\n");
}

void
myfreewalk(pagetable_t pagetable)
{
    for (uint64 i = 0; i < 512; i++) {
        pte_t pte2 = pagetable[i];
        if (!(pte2 & PTE_V)) continue;

        uint64 va2 = i * 0x40000000UL;   // 0x40000000 = 1GB
        printpte(&pagetable[i], va2, 2);

        // 大页：不再展开
        if (pte2 & (PTE_R | PTE_W | PTE_X)) continue;
        
        pagetable_t pt1 = (pagetable_t)PTE2PA(pte2);
        for (uint64 j = 0; j < 512; j++) {
            pte_t pte1 = pt1[j];
            if (!(pte1 & PTE_V)) continue;

            uint64 va1 = va2 + j * 0x200000UL;   // 2MB
            printpte(&pt1[j], va1, 1);

            if (pte1 & (PTE_R | PTE_W | PTE_X)) continue;

            pagetable_t pt0 = (pagetable_t)PTE2PA(pte1);
            for (uint64 k = 0; k < 512; k++) {
                pte_t pte0 = pt0[k];
                if (!(pte0 & PTE_V)) continue;

                uint64 va0 = va1 + k * 0x1000UL;   // 4KB
                printpte(&pt0[k], va0, 0);
            }
        }
    }
}

void
vmprint(pagetable_t pagetable)
{
    printk("page table %p\n", pagetable);
    myfreewalk(pagetable);
}
```

测试一下：

```bash
vmprint_test starting
page table 0x0000000087f33000
 ..0x0000000000000000: pte 0x0000000087f33000 pa 0x0000000087f37000 
 .. ..0x0000000000000000: pte 0x0000000087f37000 pa 0x0000000087f48000 
 .. .. ..0x0000000000000000: pte 0x0000000087f48000 pa 0x0000000087f36000 RXU
 .. .. ..0x0000000000001000: pte 0x0000000087f48008 pa 0x0000000087f45000 RWU
 .. .. ..0x0000000000002000: pte 0x0000000087f48010 pa 0x0000000087f44000 RW
 .. .. ..0x0000000000003000: pte 0x0000000087f48018 pa 0x0000000087f47000 RWU
 ..0x0000003fc0000000: pte 0x0000000087f337f8 pa 0x0000000087f34000 
 .. ..0x0000003fffe00000: pte 0x0000000087f34ff8 pa 0x0000000087f35000 
 .. .. ..0x0000003fffffe000: pte 0x0000000087f35ff0 pa 0x0000000087f25000 RW
 .. .. ..0x0000003ffffff000: pte 0x0000000087f35ff8 pa 0x0000000080006000 RX
vmprint_test: done
```

# 三、**Detect which pages have been accessed (easy)**

任务是给 xv6 增加一个**新系统调用 `pgaccess()`**，用来向用户态报告"哪些用户页被访问过（读或写）"。核心机制是利用 RISC-V 页表中的 **访问位（Accessed bit, PTE_A）**。

![image.png](/images/posts/xv6-pgtbl/image%201.png)

> 说人话：当指令访问某个虚拟地址，MMU成功访问某个页面时，会将该页面对应的PTE的PTE_A这个bit置为1，表示该页面被访问了。该bit可被用在页面被换出时判断是否需要将该页面写回到磁盘。
> 

实现 sysproc.c 中的 sys_pgaccess() 函数，该函数会从 start_va 所在页面开始，检查其与其后的 npages-1 个页面是否被访问过（PTE中A位是否为1），如果是就设置对应bits。

注意这里的mask不能直接使用一个uint64，而是应当根据参数npages的值来决定。一个可行的方案是先分配一个物理页面存储mask，在使用copyout()将其拷贝到用户进程的buf后再释放。

```c
uint64
sys_pgaccess(void)
{
    uint64 start_va;
    int npages;
    uint64 buf;

    argaddr(0, &start_va);
    argint(1, &npages);
    argaddr(2, &buf);
		
    // The bitmask needs one bit per page, so the number of pages is
    // limited by the size of the temporary buffer used to build it.
    if (npages <= 0 || npages > PGSIZE * 8)
        return -1;

    struct proc *p = myproc();

    // start_va need not be page-aligned (malloc() does not return
    // aligned pointers); the first page checked is the one containing
    // it.  All the pages checked must be inside this process's memory.
    uint64 first = PGROUNDDOWN(start_va);
    if (first + (uint64)npages * PGSIZE > p->sz)
        return -1;
    
    int nbytes = (npages + 7) / 8;
    uint8 *mask = (uint8 *)kalloc();
    if (mask == 0)
        return -1;
    memset(mask, 0, nbytes);

    for (int i = 0; i < npages; i++) {
        uint64 va = first + (uint64)i * PGSIZE;

        pte_t *pte = walk(p->pagetable, va, 0);
        if (pte == 0 || (*pte & PTE_V) == 0) {
            kfree(mask);
            return -1;
        }

        if (*pte & PTE_A) {
            mask[i / 8] |= (uint8)(1 << (i % 8));
            *pte &= ~PTE_A;
        }
    }

    if (copyout(p->pagetable, p->sz, buf, (char *)mask, nbytes) < 0) {
        kfree(mask);
        return -1;
    }
    kfree(mask);

    return 0;
}

```

# 四、**Speed up the getpid system call (easy)**

为了避免每次调用getpid()这个系统调用都进行用户态和内核态的切换，我们可以为该资源分配一段可被用户程序访问的内存空间（通过设置PTE中的访问权限U），然后将资源存入其中，以后每次调用该系统调用都可以直接在该内存地址处取，降低系统调用的开销。

每个进程都有自己独立的一块空间存储自己的pid，所以将 memlayout.h 中准备的 struct usyscall 加入 proc 结构体：

```c
// Per-process state
struct proc {
  ......

  struct usyscall *usys;
};

```

在分配进程资源时为其分配一个物理页面，并在页表中建立映射，将访问权限设置为只读 + 可被用户访问：

```c
static struct proc *
allocproc(void)
{
  struct proc *p;
  ......

  // Allocate the read-only page shared with the user process, which
  // holds the struct usyscall (the pid) at its start.
  if ((p->usys = (struct usyscall *)kalloc()) == 0) {
    freeproc(p);
    release(&p->lock);
    return 0;
  }

  // An empty user page table.
  p->pagetable = proc_pagetable(p);
  if (p->pagetable == 0) {
    freeproc(p);
    release(&p->lock);
    return 0;
  }

  ......
  return p;
}

pagetable_t
proc_pagetable(struct proc *p)
{
  ......
	
	// 注意这里的权限，可被用户访问、只读
  if (mappages(pagetable, USYSCALL, PGSIZE, (uint64)(p->usys),
               PTE_R | PTE_U) < 0) {
    uvmunmap(pagetable, TRAMPOLINE, 1, 0);
    uvmfree(pagetable, 0);
    return 0;
  }

  p->usys->pid = p->pid;

  return pagetable;
}
```

在释放进程资源时回收该页面，并解除该页面的映射：

```c
static void
freeproc(struct proc *p)
{
  ......
  
  if (p->usys) 
    kfree((void*)p->usys);
  p->usys = 0;
  if (p->pagetable)
    proc_freepagetable(p->pagetable, p->sz);
  
  ......
}

void
proc_freepagetable(pagetable_t pagetable, uint64 sz)
{
  uvmunmap(pagetable, TRAMPOLINE, 1, 0);
  uvmunmap(pagetable, TRAPFRAME, 1, 0);
  uvmunmap(pagetable, USYSCALL, 1, 0);
  uvmfree(pagetable, sz);
}
```

# 五、**Use superpages (easy)**

这个版本的大页实验不需要我们完整地实现大页，只需要稍微修改映射逻辑即可。

修改kvmmap()：

```c
void
kvmmap(pagetable_t kpgtbl, uint64 va, uint64 pa, uint64 sz, int perm)
{
  if (kvmmap_super(kpgtbl, va, sz, pa, perm) != 0)
    panic("kvmmap");
}
```

其中调用了kvmmap_super()：先尝试映射2MB的大页，最后将不足2MB的部分映射为4KB的普通页。

```c
// A copy of mappages() used only by kvmmap(), so that kernel mappings
// can be covered by superpages while user mappings stay 4KB granular.
// va, size and pa MUST be page-aligned.
// Returns 0 on success, -1 if walk() couldn't allocate a needed
// page-table page.
static int
kvmmap_super(pagetable_t pagetable, uint64 va, uint64 size, uint64 pa, int perm)
{
  // The head of the mapping, up to the next 2MB boundary, cannot be
  // covered by a superpage.
  uint64 head = (SUPERPGSIZE - va % SUPERPGSIZE) % SUPERPGSIZE;
  if (head > size)
    head = size;
  if (head > 0) {
    if (mappages(pagetable, va, head, pa, perm) < 0)
      return -1;
    va += head;
    pa += head;
    size -= head;
  }

  // Cover the 2MB-aligned part of the mapping with superpages.
  while (size >= SUPERPGSIZE && (pa % SUPERPGSIZE) == 0) {
    if (map_superpage(pagetable, va, pa, perm) < 0)
      return -1;
    va += SUPERPGSIZE;
    pa += SUPERPGSIZE;
    size -= SUPERPGSIZE;
  }

  // The tail is left to ordinary 4KB pages.
  if (size > 0)
    if (mappages(pagetable, va, size, pa, perm) < 0)
      return -1;

  return 0;
}
```

为了方便实现大页的映射，还实现了一个函数map_superpage()：

```c
// Map a single 2MB superpage: a level-1 PTE that points at the start
// of a 2MB-aligned physical region.  Only used for the kernel page
// table.  Returns 0 on success, -1 if a page-table page was needed
// but could not be allocated.
static int
map_superpage(pagetable_t pagetable, uint64 va, uint64 pa, int perm)
{
  if ((va % SUPERPGSIZE) != 0 || (pa % SUPERPGSIZE) != 0)
    return -1;
	
  // Find (or create) the level-1 page table that holds this entry.
  pagetable_t level1;
  pte_t *pte2 = &pagetable[PX(2, va)];
  if (*pte2 & PTE_V) {
    level1 = (pagetable_t)PTE2PA(*pte2);
  } else {
    if ((level1 = (pagetable_t)kalloc()) == 0)
      return -1;
    memset(level1, 0, PGSIZE);
    *pte2 = PA2PTE(level1) | PTE_V;
  }

  pte_t *pte1 = &level1[PX(1, va)];
  if (*pte1 & PTE_V)
    panic("map_superpage: remap");

  // A level-1 PTE holds the base of a 2MB region, so the low bits of
  // its physical address field are zero; PA2PTE() gives us that for
  // free because pa is 2MB-aligned.
  *pte1 = PA2PTE(pa) | PTE_V | perm;
  return 0;
}
```

测试一下：

```bash
xv6-labs-2026 ➜ make qemu
mv -f fs.img fs.img.bk
mkfs/mkfs fs.img README  user/_cat user/_echo user/_forktest user/_grep user/_init user/_kill user/_ln user/_ls user/_mkdir user/_rm user/_sh user/_stressfs user/_usertests user/_grind user/_wc user/_zombie user/_logstress user/_forphan user/_dorphan user/_sync  user/_pgtbltest
nmeta 47 (boot, super, log blocks 31, inode blocks 13, bitmap blocks 1) blocks 1953 total 2000
balloc: first 1066 blocks have been allocated
balloc: write bitmap block at sector 46
qemu-system-riscv64 -machine virt -bios none -kernel kernel/kernel -m 128M -smp 3 -nographic -global virtio-mmio.force-legacy=false -drive file=fs.img,if=none,format=raw,id=x0 -device virtio-blk-device,drive=x0,bus=virtio-mmio-bus.0

xv6 kernel is booting

hart 2 starting
hart 1 starting
init: starting sh
$ pgtbltest
print_pgtbl starting
va 0x0 pte 0x21FDF85B pa 0x87F7E000 perm 0x5B
va 0x1000 pte 0x21FDEC17 pa 0x87F7B000 perm 0x17
va 0x2000 pte 0x21FDE807 pa 0x87F7A000 perm 0x7
va 0x3000 pte 0x21FDE4D7 pa 0x87F79000 perm 0xD7
va 0x4000 pte 0x0 pa 0x0 perm 0x0
va 0x5000 pte 0x0 pa 0x0 perm 0x0
va 0x6000 pte 0x0 pa 0x0 perm 0x0
va 0x7000 pte 0x0 pa 0x0 perm 0x0
va 0x8000 pte 0x0 pa 0x0 perm 0x0
va 0x9000 pte 0x0 pa 0x0 perm 0x0
va 0x3FFFFF6000 pte 0x0 pa 0x0 perm 0x0
va 0x3FFFFF7000 pte 0x0 pa 0x0 perm 0x0
va 0x3FFFFF8000 pte 0x0 pa 0x0 perm 0x0
va 0x3FFFFF9000 pte 0x0 pa 0x0 perm 0x0
va 0x3FFFFFA000 pte 0x0 pa 0x0 perm 0x0
va 0x3FFFFFB000 pte 0x0 pa 0x0 perm 0x0
va 0x3FFFFFC000 pte 0x0 pa 0x0 perm 0x0
va 0x3FFFFFD000 pte 0x21FEC413 pa 0x87FB1000 perm 0x13
va 0x3FFFFFE000 pte 0x21FE7CC7 pa 0x87F9F000 perm 0xC7
va 0x3FFFFFF000 pte 0x20001C4B pa 0x80007000 perm 0x4B
print_pgtbl: OK
vmprint_test starting
page table 0x0000000087f81000
 ..0x0000000000000000: pte 0x0000000087f81000 pa 0x0000000087f7d000 
 .. ..0x0000000000000000: pte 0x0000000087f7d000 pa 0x0000000087f7c000 
 .. .. ..0x0000000000000000: pte 0x0000000087f7c000 pa 0x0000000087f7e000 RXU
 .. .. ..0x0000000000001000: pte 0x0000000087f7c008 pa 0x0000000087f7b000 RWU
 .. .. ..0x0000000000002000: pte 0x0000000087f7c010 pa 0x0000000087f7a000 RW
 .. .. ..0x0000000000003000: pte 0x0000000087f7c018 pa 0x0000000087f79000 RWU
 ..0x0000003fc0000000: pte 0x0000000087f817f8 pa 0x0000000087f80000 
 .. ..0x0000003fffe00000: pte 0x0000000087f80ff8 pa 0x0000000087f7f000 
 .. .. ..0x0000003fffffd000: pte 0x0000000087f7ffe8 pa 0x0000000087fb1000 RU
 .. .. ..0x0000003fffffe000: pte 0x0000000087f7fff0 pa 0x0000000087f9f000 RW
 .. .. ..0x0000003ffffff000: pte 0x0000000087f7fff8 pa 0x0000000080007000 RX
vmprint_test: done
pgaccess_test starting
pgaccess_test: OK
ugetpid_test starting
ugetpid_test: OK
ksuper_test: OK
pgtbltest: all tests succeeded
$ 
```