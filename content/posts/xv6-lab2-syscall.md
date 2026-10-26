---
title: "MIT6.1810: Lab2 Syscall"
date: '2026-10-26T09:23:20+08:00'
draft: false
tags: [操作系统, xv6]
categories: [MIT6.1810]
---

在这个lab中我们将深入理解xv6（其他系统也差不多）的系统调用是如何实现的，并尝试根据功能需求实现自己的系统调用。

关于xv6的概述和系统调用的逻辑可以看[这篇文章](https://jiangmmh.github.io/posts/xv6-01/)，后面就不过多介绍了。

# 一、**Using gdb (easy)**

这部分内容主要是介绍gdb的使用方法，略。

# 二、**Sandbox a command(moderate)**

题目要求实现一个系统调用interpose，其接受两个参数：一个整数掩码和一个路径，前者指定了要屏蔽哪些系统调用，后者暂时不用管。如果要使用interpose屏蔽当前进程的open系统调用，用法如下：

```c
interpose(1 << SYS_open, "-")
```

现在开始实现该系统调用，首先是用户侧：

- 在 user/user.h 中添加 interpose() 的声明 。
    - int interpose(int, const char *);
- 在 user/usys.pl 中添加一行内容用于生成系统调用入口函数的实现。
    - entry("interpose");

题目提供了两个程序sandbox.c和sbtest.c，我们需要在Makefile中将其加入编译：

```makefile
UPROGS=\
	......
	$U/_sandbox\
	$U/_sbtest\
```

在内核侧：

- 在 kernel/syscall.h 中添加 interpose 的系统调用号宏定义
    - #define SYS_interpose   23
- 在 kernel/proc.h 的proc结构体中添加一个interpose_mask，记录屏蔽字
    - int interpose_mask;
- 在 kernel/sysproc.c 中添加函数 sys_interpose() 处理interpose系统调用
    
    ```c
    uint64
    sys_interpose(void)
    {
      int interpose_mask;
      argint(0, &interpose_mask);
    
      myproc()->interpose_mask = interpose_mask;
      
      return 0;
    }
    ```
    
- 为了使子进程能够继承父进程的屏蔽字，需要在创建子进程时拷贝interpose_mask，在 kernel/proc.c 中的 kfork() 函数的末尾添加 interpose_mask 的拷贝。
    
    ```c
    // Create a new process, copying the parent.
    // Sets up child kernel stack to return as if from fork() system call.
    int
    kfork(void)
    {
      ......
      
      // 子进程继承父进程的interpose_mask
      np->interpose_mask = p->interpose_mask;
    
      return pid;
    }
    ```
    
- 最后修改syscall.c，在syscalls表中添加sys_interpose，然后在syscall()函数中检查用户进程请求的系统调用是否已被屏蔽，如果是就将返回值置为-1（注意，**系统调用的结果会通过a0寄存器返回**）。
    
    ```c
    extern uint64 sys_interpose(void);
    
    // An array mapping syscall numbers from syscall.h
    // to the function that handles the system call.
    static uint64 (*syscalls[])(void) = {
      // clang-format off
      ......
      [SYS_interpose]     = sys_interpose,
      // clang-format on
    };
    
    void
    syscall(void)
    {
      int num;
      struct proc *p = myproc();
    
      num = p->trapframe->a7;
      if (num > 0 && num < NELEM(syscalls) && syscalls[num]) {
        // Use num to lookup the system call function for num, call it,
        // and store its return value in p->trapframe->a0
    
        // 检查num号系统调用是否被屏蔽
        if (p->interpose_mask & (1 << num)) {
          p->trapframe->a0 = -1;
        } else {
          p->trapframe->a0 = syscalls[num]();
        }
      } else {
        printk("%d %s: unknown sys call %d\n", p->pid, p->name, num);
        p->trapframe->a0 = -1;
      }
    }
    ```
    

测试一下：

```bash
xv6-labs-2026 ➜ ./grade-lab-syscall sandbox_mask
make: `kernel/kernel' is up to date.
== Test sandbox_mask == sandbox_mask: OK (0.4s) 
```

# 三、**Sandbox with allowed pathnames(easy)**

这里要求实现上一题中未处理的第二个参数，该参数会传入一个路径**allowed_path**，如果请求的系统调用是exec或open，且目标路径在allowed_path之下，那么即使该系统调用被屏蔽了仍可以成功执行。

在proc结构体中添加新成员 allowed_path：

```c
// Per-process state
struct proc {
  ......
  
  int interpose_mask;
  char allowed_path[MAXPATH];
};
```

首先修改sys_interpose()，在其中获取第二个参数，并将其记录在进程结构体的allowed_path中。

注意这里对于已经调用过interpose()的进程，不允许再次修改屏蔽字和allowed_path。

```c
uint64
sys_interpose(void)
{
  int interpose_mask;
  char buf[MAXPATH];

  argint(0, &interpose_mask);
  if (argstr(1, buf, MAXPATH) == -1) {
    return -1;
  }

  struct proc *p = myproc();

  // 已经设置沙箱限制后，不允许进程自行修改
  if (p->interpose_mask != 0 || p->allowed_path[0] != '\0') {
    return -1;
  }
	
  p->interpose_mask = interpose_mask;
  safestrcpy(p->allowed_path, buf, MAXPATH);

  return 0;
}
```

实现思路：

- 如果发现系统调用被屏蔽，检查该调用是否为exec或open
    - 如果不是，直接返回-1
    - 如果是，调用函数path_allowed()检查该调用的目标路径是否被允许
        - 如果是就执行调用
        - 否则返回-1
- 如果未被屏蔽，执行该调用

```c
void
syscall(void)
{
  int num;
  struct proc *p = myproc();

  num = p->trapframe->a7;
  if (num > 0 && num < NELEM(syscalls) && syscalls[num]) {
    // Use num to lookup the system call function for num, call it,
    // and store its return value in p->trapframe->a0
    
    // 检查num号系统调用是否被屏蔽
    if (p->interpose_mask & (1 << num)) {
      if (num == SYS_exec || num == SYS_open) {
        char buf[MAXPATH];

        if (argstr(0, buf, MAXPATH) == -1) {
          // argstr失败，直接返回-1
          p->trapframe->a0 = -1;
        } else if (path_allowed(buf, p->allowed_path)) {
          // path被允许
          p->trapframe->a0 = syscalls[num]();
        } else {
          // path不被允许
          p->trapframe->a0 = -1;
        }
      } else { 
        // 非exec & 非fork
        p->trapframe->a0 = -1;
      }
    } else {
      p->trapframe->a0 = syscalls[num]();
    }
  } else {
    printk("%d %s: unknown sys call %d\n", p->pid, p->name, num);
    p->trapframe->a0 = -1;
  }
}
```

最后来实现判断路径是否被允许的函数path_allowed()，其功能为：判断一个文件路径是否位于允许访问的路径范围内，同时拒绝通过 `..` 进行目录穿越。

```c
// 检查路径中是否包含 ".." 目录分量
static int
has_parent_dir(char *path)
{
    char *p = path;

    while (*p != '\0') {
        // 找到一个路径分量的起点
        if (p == path || p[-1] == '/') {
            if (p[0] == '.' &&
                p[1] == '.' &&
                (p[2] == '/' || p[2] == '\0')) {
                return 1;
            }
        }
        p++;
    }
    return 0;
}

// 检查 path 是否位于 allowed 指定的路径范围内
static int
path_allowed(char *path, char *allowed)
{
    int len;

    // 没有设置允许路径，拒绝访问 
    if (allowed == 0 || allowed[0] == '\0') {
        return 0;
    }
    
    // 拒绝通过 ".." 进行目录穿越
    if (has_parent_dir(path)) {
        return 0;
    }

    // path 必须以 allowed 为前缀
    len = strlen(allowed);

    if (strncmp(path, allowed, len) != 0) {
        return 0;
    }

    // 前缀后面必须是路径结束符或目录分隔符
    if (path[len] != '\0' && path[len] != '/') {
        return 0;
    }

    return 1;
}
```

测试一下：

```bash
== Test sandbox_mask == 
$ make qemu-gdb
sandbox_mask: OK (5.9s) 
== Test sandbox_fork == 
$ make qemu-gdb
sandbox_fork: OK (1.2s) 
== Test sandbox_path == 
$ make qemu-gdb
sandbox_path: OK (1.0s) 
== Test sandbox_most == 
$ make qemu-gdb
sandbox_most: OK (0.9s) 
== Test sandbox_minus == 
$ make qemu-gdb
sandbox_minus: OK (1.1s) 
== Test sandbox_block == 
$ make qemu-gdb
sandbox_block: OK (0.9s) 
== Test sandbox_escape == 
$ make qemu-gdb
sandbox_escape: OK (1.1s) 
    (Old xv6.out.sandbox_escape failure log removed)
== Test sandbox_forkpath == 
$ make qemu-gdb
sandbox_forkpath: OK (0.9s) 
```

# 四、**Attack xv6 (moderate)**

在该lab中，conf/lab.mk 里是 LAB=syscall ，Makefile会加上LAB_SYSCALL宏，这个宏关掉了xv6中的三个内存擦除行为：

```c
// kernel/kalloc.c  kfree()
#ifndef LAB_SYSCALL
  memset(pa, 1, PGSIZE);   // 原本用垃圾填满整页以暴露野指针
#endif

// kernel/kalloc.c  kalloc()
#ifndef LAB_SYSCALL
  memset((char *)r, 5, PGSIZE);
#endif

// kernel/vm.c  uvmalloc()
#ifndef LAB_SYSCALL
  memset(mem, 0, sz);      // 原本把新用户页清零
#endif
```

下面是几个内存布局相关的常量：

![image.png](/images/posts/lab-syscall/image.png)

物理页分配器 `kalloc()`/`kfree()` 维护一个**单向 LIFO 链表** `kmem.freelist` ，页面的分配和释放是后进先出的：

```c
// kfree(): 头插
r->next = kmem.freelist;  kmem.freelist = r;
// kalloc(): 头出
r = kmem.freelist;  kmem.freelist = r->next;`
```

> 关键问题：从在shell中执行secret后，到运行attack之间内存是如何分配和释放的？
> 

**在shell中运行程序会先调用fork()系统调用，然后执行exec()系统调用。**

**先来看fork()，该系统调用在内核侧会调用kfork()：**

1. 其中会调用allocproc()分配一个进程，其中**分配了一个页面**，作为trapframe
2. 调用proc_pagetable()为进程分配页表
    - 其中调用uvmcreate()，**分配一个页面**作为页目录表
    - 调用mappages()为TRAMPOLINE和TRAPFRAME分配页表
        - 为TRAMPOLINE分配页表时，**分配两个页面**作为次两级页表
        - TRAPFRAME的地址紧接TRAMPOLINE，因此两者共用三级页表，无需再分配页面
3. 调用uvmcopy()拷贝父进程的内存空间，**分了若干页面，但不知道具体分配了多少，假设为k**。

**再来看exec()，在内核侧会调用sys_exec()：**

1. 其中会为程序的**每个命令行参数分配一个页面**，然后调用kexec()
2. 在其中调用proc_pagetable()为进程分配页表，同fork()，**分配了若干页面**。
3. 在加载目标程序到内存的过程中**分配了若干页面**。
4. **分配两个页面**作为用户栈（一个作为栈，另一个作为guard page）
5. **最后调用proc_freepagetable()释放前面在fork中分配的旧页表中的全部页面（对应fork中第2步和第3步的全部页面）**

**用户程序执行完毕后会使用系统调用exit()退出，其中会：**

1. 关闭全部打开的文件
2. 将所有子进程都交给init进程
3. 唤醒父进程
4. 将当前进程的状态设置为ZOMBIE

**在shell中会调用系统调用wait()等待子进程执行完毕，其会释放进程的资源：**

- 反复从shell进程的子进程中过搜索状态为ZOMBIE的进程
- 调用freeproc()释放子进程
    - 先释放trapframe的**一个页面**
    - 释放当前进程的页表中的全部页面。

---

> 当然，即使知道了这些，我们还是无法弄清楚目标secret在哪。
> 

解题的核心思路：**不要去算秘密落在哪个物理页。让 attack 申请一大块堆，然后在里面扫标记字符串即可 —— 页被复用到哪算哪。**

```c
#include "kernel/types.h"
#include "user/user.h"

#define NUMPAGES 128
#define MARKER   "Here it is: "
#define MARKLEN  12
#define SECRETLEN 8

static int
isalnum_(char c)
{
  return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') ||
         (c >= 'A' && c <= 'Z');
}

int
main(int argc, char *argv[])
{
  char *base, *end, *p;
  int i;

  // 一次要够多的页：秘密页在 free list 里排第 19 位左右，
  // 128 页足够覆盖（两次 attack 的位置分别是第 20 页和第 104 页）。
  base = sbrk(NUMPAGES * 4096);
  if (base == SBRK_ERROR) { printf("attack: sbrk failed\n"); exit(1); }
  end = base + NUMPAGES * 4096;

  for (p = base; p + MARKLEN + SECRETLEN + 1 < end; p++) {
    if (memcmp(p, MARKER, MARKLEN) != 0)
      continue;

    // 排除 .rodata 里那个只有标记、没有秘密的拷贝
    for (i = 0; i < SECRETLEN; i++)
      if (!isalnum_(p[MARKLEN + i]))
        break;
    if (i != SECRETLEN || p[MARKLEN + SECRETLEN] != '\0')
      continue;

    printf("%s\n", p + MARKLEN);   // 秘密必须独占一行，grader 用 ^secret 匹配
    exit(0);
  }

  printf("attack: secret not found\n");
  exit(1);
}
```

测试一下：

```bash
xv6-labs-2026 ➜ make grade
== Test answers-syscall.txt == 
answers-syscall.txt: OK 
== Test sandbox_mask == 
$ make qemu-gdb
sandbox_mask: OK (4.3s) 
== Test sandbox_fork == 
$ make qemu-gdb
sandbox_fork: OK (1.1s) 
== Test sandbox_path == 
$ make qemu-gdb
sandbox_path: OK (1.1s) 
== Test sandbox_most == 
$ make qemu-gdb
sandbox_most: OK (0.9s) 
== Test sandbox_minus == 
$ make qemu-gdb
sandbox_minus: OK (1.0s) 
== Test sandbox_block == 
$ make qemu-gdb
sandbox_block: OK (1.0s) 
== Test sandbox_escape == 
$ make qemu-gdb
sandbox_escape: OK (1.1s) 
== Test sandbox_forkpath == 
$ make qemu-gdb
sandbox_forkpath: OK (0.9s) 
== Test attack == 
$ make qemu-gdb
attack: OK (1.1s) 
== Test time == 
time: OK 
Score: 60/60
```

> **总结**：手工推算每个物理页的复用顺序就当作加深对xv6进程创建和销毁过程的理解，但是不能用其来解题。编写attack 只需要申请大量页面，然后在其中搜索即可。
>