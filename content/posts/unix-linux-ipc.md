---
title: "Unix/Linux 进程间通信"
date: '2026-10-22T15:33:34+08:00'
draft: false
tags: ["C语言", "Linux", "IPC", "Socket", "TCP", "UDP", "操作系统"]
categories: ["操作系统"]
description: "深入理解 Unix/Linux 进程间通信机制，涵盖文件描述符、fork、管道、socketpair、Unix Domain Socket、TCP/UDP Socket、数据传输语义、错误处理与实战示例。"
---

> 本文是基于经典 BSD 进程间通信教程所涉及的概念重新编写的中文学习笔记，并非原文的逐字翻译。
>
> **参考原文：** [Stuart Sechrest, *An Introductory 4.4BSD Interprocess Communication Tutorial*](https://docs-archive.freebsd.org/44doc/psd/20.ipctut/paper.pdf) 。原文属于 4.4BSD 文档档案。


## 一、为什么需要进程间通信？

现代操作系统通常同时运行大量进程。例如文本编辑器、浏览器、数据库、网络服务、编译器以及系统后台服务，都可能由多个进程协同完成工作。

进程之间拥有相对独立的地址空间。一个进程中的普通指针通常不能直接访问另一个进程的内存，因此，进程不能像同一个程序中的两个函数那样，直接通过共享变量交换数据。

例如，一个网络服务器可能将工作划分为多个部分：

- 主进程负责监听连接和接收客户端请求。
- 工作进程负责处理具体请求。
- 日志进程负责收集并写入日志。
- 其他辅助进程负责缓存、配置更新或后台任务。

这些进程需要交换数据、传递任务、同步状态，甚至协调资源的使用。这就需要进程间通信机制，即 IPC（Inter-Process Communication）。

Unix/Linux 提供了多种 IPC 机制，包括：

- 匿名管道（Pipe）
- 命名管道（FIFO）
- `socketpair()`
- Unix Domain Socket
- TCP Socket
- UDP Socket
- 共享内存
- 消息队列
- 信号量与其他同步机制

这些机制并不是彼此完全独立的技术。它们反映了操作系统设计中的几个核心问题：

1. 通信双方如何找到彼此？
2. 内核如何在两个进程之间传递数据？
3. 通信是否需要可靠、有序地交付数据？
4. 通信双方是否必须存在于同一台机器？
5. 数据是否具有明确的消息边界？
6. 当一方退出、崩溃或停止读取时，另一方会发生什么？

理解这些问题，比单纯记住系统调用更重要。

本文主要围绕 Berkeley Unix 4.4BSD 的经典 IPC 教程所涉及的机制展开，并使用现代 Linux/POSIX C 接口编写示例。原始手册是理解 Unix IPC 设计的重要历史材料，但部分环境细节和接口习惯具有时代特征，因此本文会区分通用概念与现代 Linux 实践。

## 二、Unix IPC 的基本设计思想

### 2.1 将通信抽象为 I/O

Unix 的一个重要设计思想是：尽可能使用统一的接口操作不同类型的资源。

普通文件可以使用：

```c
open();
read();
write();
close();
```

管道也可以使用：

```c
read();
write();
close();
```

对于已经建立连接的 Socket，同样可以使用 `read()` 和 `write()` 进行字节流读写。

这种统一接口带来了一个重要好处：应用程序不必了解内核内部如何实现每一种通信机制，就可以通过文件描述符操作通信端点。

例如：

```c
int fd = open("data.txt", O_RDONLY);

char buffer[1024];
ssize_t n = read(fd, buffer, sizeof(buffer));

close(fd);
```

对于管道：

```c
int pipefd[2];

pipe(pipefd);

write(pipefd[1], "hello", 5);

char buffer[16];
ssize_t n = read(pipefd[0], buffer, sizeof(buffer));
```

对于已经连接的 TCP Socket：

```c
write(socket_fd, "hello", 5);

char buffer[1024];
ssize_t n = read(socket_fd, buffer, sizeof(buffer));
```

这三类资源在底层实现上差异很大，但它们都能在相当程度上使用相同的 I/O 编程模型。

需要注意的是，统一接口不意味着所有资源拥有完全相同的语义。例如，普通文件通常支持定位读写，而管道和 TCP 字节流通常不支持通过 `lseek()` 任意移动读写位置。

### 2.2 文件描述符是什么？

文件描述符（File Descriptor，FD）是进程用来引用内核管理的 I/O 对象的一个小整数。

常见的文件描述符包括：

| 文件描述符 | 通常用途 |
|---|---|
| `0` | 标准输入 `stdin` |
| `1` | 标准输出 `stdout` |
| `2` | 标准错误 `stderr` |
| 其他非负整数 | 文件、管道、Socket 等 |

例如：

```c
int fd = open("data.txt", O_RDONLY);
```

如果打开成功，`fd` 可能是 `3`、`4` 或其他非负整数。这个数字不是文件内容，也不是文件在磁盘上的地址，而是当前进程文件描述符表中的一个索引。

可以从三个层次理解它：

1. **文件描述符表项**：属于某个进程，记录描述符相关的状态和引用。
2. **打开文件描述（open file description）**：保存文件偏移量以及文件状态标志等信息。
3. **底层内核对象**：可能是普通文件、管道、Socket 或其他内核资源。

不同描述符可以引用同一个打开文件描述，因此可能共享文件偏移量和部分状态。Socket 则引用相应的通信端点。

这种间接引用使内核能够统一管理资源生命周期，并在进程关闭描述符时减少相应引用。

### 2.3 为什么 IPC 通常返回文件描述符？

以 `pipe()` 为例：

```c
int pipefd[2];

if (pipe(pipefd) == -1) {
    perror("pipe");
    return 1;
}
```

成功后：

- `pipefd[0]` 是管道的读端。
- `pipefd[1]` 是管道的写端。

程序通过文件描述符访问内核中的管道对象，而不需要知道内核如何组织管道缓冲区。

Socket 也采用类似设计：

```c
int fd = socket(AF_INET, SOCK_STREAM, 0);
```

`socket()` 创建一个 Socket，并返回其文件描述符。后续操作可以通过该描述符配置通信端点、建立连接、发送数据或接收数据。

**理解 IPC 的第一条原则：应用程序持有的是内核资源的引用，而不是通信资源本身。**

### 2.4 `fork()` 与文件描述符继承

Unix 中的 `fork()` 会创建一个子进程。

```c
pid_t pid = fork();
```

调用成功后，父进程和子进程各自拥有独立的进程地址空间，但子进程会继承父进程的文件描述符。

这些描述符通常引用相同的底层打开文件描述或通信对象。

这为父子进程之间建立通信提供了基础。

例如：

```text
父进程
  |
  | pipe()
  v
读端 FD <---- 管道内核对象 ----> 写端 FD
                                  |
                                  | fork()
                                  v
                              子进程继承 FD
```

父子进程可以分别使用自己持有的描述符进行读写。

这里有一个容易忽略的细节：`fork()` 复制了描述符引用，但不会复制出一个完全独立、互不相关的管道通信通道。双方持有的引用仍然指向同一组底层通信资源。

因此，父进程关闭自己的写端，并不一定意味着管道已经没有写端。如果子进程或其他进程仍然持有写端，读者就不能立即通过 EOF 判断所有写入者都已关闭。

这一点对理解管道的生命周期尤其重要。

## 三、匿名管道：最简单的进程间通信

### 3.1 管道的基本概念

匿名管道（Pipe）提供一个简单的字节流通信通道。

典型调用是：

```c
int pipe(int pipefd[2]);
```

调用成功后：

- `pipefd[0]` 用于读取。
- `pipefd[1]` 用于写入。

数据通常从写端进入管道缓冲区，再从读端被取走：

```text
写入进程
   |
   | write(pipefd[1], ...)
   v
+---------------------+
|    管道内核缓冲区   |
+---------------------+
   |
   | read(pipefd[0], ...)
   v
读取进程
```

匿名管道一般用于具有继承关系的进程，例如父子进程。

它不是普通磁盘文件，也不需要在文件系统中创建一个可以通过路径打开的对象。

### 3.2 管道为什么通常是单向的？

`pipe()` 返回一对分别用于读取和写入的描述符。

通常将它作为单向通道使用：

```text
进程 A --写端--> 管道 --读端--> 进程 B
```

如果希望两个进程都能主动向对方发送数据，最直观的方法是创建两条管道：

```text
进程 A --管道 1--> 进程 B
进程 A <--管道 2-- 进程 B
```

这种方式能实现双向通信，但需要管理更多描述符。

对于本地双向通信，`socketpair()` 往往更方便，后文会详细介绍。

### 3.3 示例：父进程向子进程发送数据

下面的程序创建一条管道，然后通过 `fork()` 创建子进程。父进程向管道写入一段消息，子进程读取并输出消息。

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/wait.h>

int main(void) {
    int pipefd[2];

    if (pipe(pipefd) == -1) {
        perror("pipe");
        return EXIT_FAILURE;
    }

    pid_t pid = fork();

    if (pid == -1) {
        perror("fork");
        close(pipefd[0]);
        close(pipefd[1]);
        return EXIT_FAILURE;
    }

    if (pid == 0) {
        // 子进程只需要读取管道。
        close(pipefd[1]);

        char buffer[128];
        ssize_t n;

        while ((n = read(pipefd[0], buffer,
                         sizeof(buffer))) > 0) {
            if (fwrite(buffer, 1, (size_t)n, stdout)
                    != (size_t)n) {
                perror("fwrite");
                close(pipefd[0]);
                _exit(EXIT_FAILURE);
            }
        }

        if (n == -1) {
            perror("read");
            close(pipefd[0]);
            _exit(EXIT_FAILURE);
        }

        close(pipefd[0]);
        _exit(EXIT_SUCCESS);
    }

    // 父进程只需要写入管道。
    close(pipefd[0]);

    const char *message = "Hello from parent process!\n";
    size_t remaining = strlen(message);
    const char *p = message;

    while (remaining > 0) {
        ssize_t n = write(pipefd[1], p, remaining);

        if (n == -1) {
            perror("write");
            close(pipefd[1]);
            waitpid(pid, NULL, 0);
            return EXIT_FAILURE;
        }

        p += n;
        remaining -= (size_t)n;
    }

    close(pipefd[1]);

    if (waitpid(pid, NULL, 0) == -1) {
        perror("waitpid");
        return EXIT_FAILURE;
    }

    return EXIT_SUCCESS;
}
```

编译和运行：

```bash
cc -Wall -Wextra -O2 pipe_demo.c -o pipe_demo
./pipe_demo
```

预期输出：

```text
Hello from parent process!
```

### 3.4 为什么必须关闭不需要的管道端？

这个例子有两个关键操作：

```c
// 子进程
close(pipefd[1]);

// 父进程
close(pipefd[0]);
```

它们不仅是为了减少资源占用，也是为了保证通信语义正确。

假设父进程写入完成后关闭了写端：

```c
close(pipefd[1]);
```

当管道中已经没有可读取的数据，并且所有写端描述符都已关闭时，读端的 `read()` 才会返回 `0`，表示 EOF。

如果子进程仍然持有一个不使用的写端，那么内核仍然认为存在写入者。即使父进程已经关闭自己的写端，子进程也可能一直等待数据，而无法观察到 EOF。

这就是管道程序中经常出现的死等问题。

**判断 EOF 时，内核关心的是所有相关写端引用是否关闭，而不是某一个特定进程是否结束了写入。**

### 3.5 管道的阻塞行为

管道的读写行为受缓冲区状态和描述符模式影响。

常见情况如下：

| 操作 | 典型行为 |
|---|---|
| 管道有数据时读取 | 返回可读取的数据 |
| 管道暂时无数据，但仍有写端 | 阻塞等待，除非设置非阻塞模式 |
| 所有写端关闭且数据读完 | `read()` 返回 `0` |
| 管道缓冲区有空间时写入 | 通常可以写入 |
| 管道缓冲区已满 | 阻塞等待，除非设置非阻塞模式 |
| 没有任何读端时写入 | 通常触发 `SIGPIPE`；若信号被忽略或处理，`write()` 会失败并报告 `EPIPE` |

不要假设一次 `read()` 一定能读取某个完整的逻辑消息，也不要假设一次 `write()` 一定能完成全部写入。

即使对于本地管道，也应该根据返回值处理部分读写。

### 3.6 `PIPE_BUF` 与原子写入

多个进程可能同时向同一个管道写数据。

POSIX 为管道和 FIFO 定义了 `PIPE_BUF` 相关的原子性规则：不超过该上限的单次写入，在满足相应规范条件时，不会与其他写入者的写入内容交错。

但是必须区分两个概念：

- **写入原子性**：一次符合条件的写入不会与其他写入者的内容混杂。
- **读取消息完整性**：读者一次 `read()` 必须取到一条完整消息。

前者并不意味着后者成立。读取方仍然可能需要多次读取才能取得完整数据。

`PIPE_BUF` 也不是管道总容量。它规定的是特定条件下的写入原子性边界，而不是整个管道能存放多少字节。

## 四、命名管道 FIFO：没有亲缘关系的进程也能通信

匿名管道通常通过 `fork()` 将描述符传递给相关进程。如果两个互不相关的进程需要通信，可以考虑命名管道 FIFO。

FIFO 在文件系统中具有一个路径名。一个进程可以创建它，其他具有相应权限的进程可以通过该路径打开它。

创建方式：

```c
#include <sys/types.h>
#include <sys/stat.h>

if (mkfifo("/tmp/my_fifo", 0600) == -1) {
    perror("mkfifo");
}
```

然后分别打开读端和写端：

```c
int fd = open("/tmp/my_fifo", O_RDONLY);
```

或：

```c
int fd = open("/tmp/my_fifo", O_WRONLY);
```

实际使用时需要包含 `<fcntl.h>`，并处理 `open()`、`read()`、`write()` 等调用的错误。

FIFO 的优势在于通信双方不必是同一个父进程创建的子进程，也不必预先继承相同的文件描述符。

但 FIFO 仍然是一种本地 IPC 机制。它不像 TCP Socket 那样直接提供跨主机通信能力。

还要注意，FIFO 的打开行为可能发生阻塞。例如，在默认阻塞模式下，单独打开 FIFO 的读端或写端可能会等待另一端出现。设计程序时应当考虑双方的启动顺序和异常退出情况。

## 五、Socket Pair：本地双向通信的简洁方案

### 5.1 什么是 `socketpair()`？

对于同一台机器上的两个进程，`socketpair()` 可以直接创建一对互相连接的 Socket。

函数原型：

```c
#include <sys/types.h>
#include <sys/socket.h>

int socketpair(
    int domain,
    int type,
    int protocol,
    int sv[2]
);
```

典型调用：

```c
int sv[2];

if (socketpair(AF_UNIX, SOCK_STREAM, 0, sv) == -1) {
    perror("socketpair");
}
```

成功后，`sv[0]` 和 `sv[1]` 是两个已经建立连接的通信端点。

与普通 `pipe()` 不同，Socket Pair 的两端通常都可以发送和接收数据：

```text
进程 A                         进程 B
  |                              |
  | sv[0]                        | sv[1]
  | <------ 双向通信连接 ------>  |
  |                              |
```

它非常适合父子进程通信，因为可以先创建 Socket Pair，再通过 `fork()` 将描述符继承给子进程。

### 5.2 示例：使用 Socket Pair 实现双向通信

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/wait.h>

static int write_all(int fd, const void *data, size_t len) {
    const char *p = data;

    while (len > 0) {
        ssize_t n = write(fd, p, len);

        if (n == -1) {
            return -1;
        }

        p += n;
        len -= (size_t)n;
    }

    return 0;
}

int main(void) {
    int sv[2];

    if (socketpair(AF_UNIX, SOCK_STREAM, 0, sv) == -1) {
        perror("socketpair");
        return EXIT_FAILURE;
    }

    pid_t pid = fork();

    if (pid == -1) {
        perror("fork");
        close(sv[0]);
        close(sv[1]);
        return EXIT_FAILURE;
    }

    if (pid == 0) {
        close(sv[0]);

        const char *reply = "Hello from child!\n";

        if (write_all(sv[1], reply, strlen(reply)) == -1) {
            perror("child write");
            close(sv[1]);
            _exit(EXIT_FAILURE);
        }

        char buffer[128];
        ssize_t n = read(sv[1], buffer, sizeof(buffer));

        if (n == -1) {
            perror("child read");
            close(sv[1]);
            _exit(EXIT_FAILURE);
        }

        if (n > 0) {
            fwrite(buffer, 1, (size_t)n, stdout);
        }

        close(sv[1]);
        _exit(EXIT_SUCCESS);
    }

    close(sv[1]);

    char buffer[128];
    ssize_t n = read(sv[0], buffer, sizeof(buffer));

    if (n == -1) {
        perror("parent read");
        close(sv[0]);
        waitpid(pid, NULL, 0);
        return EXIT_FAILURE;
    }

    if (n > 0) {
        fwrite(buffer, 1, (size_t)n, stdout);
    }

    const char *reply = "Hello from parent!\n";

    if (write_all(sv[0], reply, strlen(reply)) == -1) {
        perror("parent write");
        close(sv[0]);
        waitpid(pid, NULL, 0);
        return EXIT_FAILURE;
    }

    close(sv[0]);

    if (waitpid(pid, NULL, 0) == -1) {
        perror("waitpid");
        return EXIT_FAILURE;
    }

    return EXIT_SUCCESS;
}
```

这个例子演示了一个重要事实：Socket 不一定意味着网络通信。`AF_UNIX` Socket 可以在同一台机器上的进程之间提供通信能力。

不过，这个简单示例只展示一次发送和接收，生产代码还需要根据协议正确处理部分读写、EOF 和中断等情况。

### 5.3 Socket Pair 与管道如何选择？

| 对比维度 | 匿名管道 | Socket Pair |
|---|---|---|
| 通信方向 | 通常按单向通道使用 | 通常支持双向通信 |
| 创建方式 | `pipe()` | `socketpair()` |
| 常见通信对象 | 父子进程、相关进程 | 父子进程或传递了描述符的进程 |
| 数据语义 | 字节流 | 取决于 Socket 类型 |
| 接口扩展性 | 简单 | 可以使用 Socket 相关接口 |
| 适合场景 | 简单的数据流水线 | 双向请求、响应或控制通道 |

如果只是将一个程序的输出送入另一个程序，管道通常已经足够。

如果希望两个进程都能够主动发送数据，并且需要使用 Socket 相关的控制接口，那么 Socket Pair 通常更合适。

## 六、Socket 的核心抽象

### 6.1 Socket 是通信端点

Socket 可以理解为操作系统提供的一种通信端点抽象。

应用程序通过 Socket 描述符访问这个端点，并使用相应的系统调用建立连接、收发数据或执行控制操作。

与普通文件不同，Socket 的语义还取决于其通信域、类型和协议。

例如：

```c
int fd = socket(AF_INET, SOCK_STREAM, 0);
```

这表示创建一个 Internet 协议域中的流式 Socket，通常用于 TCP 通信。

再例如：

```c
int fd = socket(AF_INET, SOCK_DGRAM, 0);
```

这通常用于 UDP 数据报通信。

`socket()` 负责创建 Socket，但并不意味着 TCP 连接已经建立。对于 TCP 客户端，还需要使用 `connect()`；对于 TCP 服务端，则需要绑定本地地址、监听并接受连接。

### 6.2 通信域：`AF_UNIX`、`AF_INET` 与 `AF_INET6`

通信域（Address Family）决定 Socket 地址的表示方式以及所使用的通信体系。

| 通信域 | 用途 | 常见地址形式 |
|---|---|---|
| `AF_UNIX` | 同一台机器上的本地 IPC | 文件系统路径或抽象地址（Linux 特有） |
| `AF_INET` | IPv4 网络通信 | IPv4 地址与端口 |
| `AF_INET6` | IPv6 网络通信 | IPv6 地址与端口 |

在现代 Linux 中，`AF_LOCAL` 通常与 `AF_UNIX` 等价。

Unix Domain Socket 通常不需要经过 IP 网络协议栈进行主机间路由，因此适合本地服务之间的通信，例如守护进程、数据库、容器组件和系统服务。

TCP/UDP Socket 则通常使用 IP 地址和端口标识网络端点，可以用于同一台机器上的网络通信，也可以用于不同主机之间的通信。

### 6.3 Socket 类型：流式与数据报

常见的 Socket 类型包括：

- `SOCK_STREAM`
- `SOCK_DGRAM`
- `SOCK_SEQPACKET`

它们描述应用程序可以观察到的通信语义。

#### `SOCK_STREAM`

流式 Socket 提供连续的字节流。对于 TCP，它通常具备可靠、有序的传输语义。

但 TCP 不保留应用程序每次 `send()` 或 `write()` 调用所对应的消息边界。

例如，发送端执行：

```c
send(fd, "hello", 5, 0);
send(fd, "world", 5, 0);
```

接收端可能一次读到：

```text
helloworld
```

也可能先读到：

```text
hel
```

再读到：

```text
loworld
```

接收端不能依赖发送端的调用次数推断消息边界。

#### `SOCK_DGRAM`

数据报 Socket 以独立的数据报为通信单位。UDP 是最常见的例子。

数据报具有边界，但 UDP 本身不保证数据一定送达，也不保证数据报按发送顺序到达，更不保证不会重复或丢失。

#### `SOCK_SEQPACKET`

`SOCK_SEQPACKET` 提供有序、面向连接并保留记录边界的通信语义，具体保证取决于所使用的协议和平台。

它在本地 IPC 中也有用途，但不像 TCP 的 `SOCK_STREAM` 那样普遍适用于各种网络场景。

### 6.4 协议参数为什么经常为 `0`？

Socket 创建函数的第三个参数是协议：

```c
socket(domain, type, protocol);
```

当 `protocol` 为 `0` 时，系统通常根据指定的通信域和 Socket 类型选择默认协议。

例如：

```c
socket(AF_INET, SOCK_STREAM, 0);
```

通常选择 TCP。

而：

```c
socket(AF_INET, SOCK_DGRAM, 0);
```

通常选择 UDP。

因此，`0` 并不是说 Socket 不使用协议，而是让系统选择与该域和类型相匹配的默认协议。

## 七、TCP Socket：建立连接的完整流程

TCP 是面向连接的字节流传输协议。

从应用程序的角度看，典型的 TCP 服务端与客户端使用不同的系统调用序列。

### 7.1 服务端的调用流程

```text
socket()
   |
   v
bind()
   |
   v
listen()
   |
   v
accept()
   |
   v
recv()/send()
   |
   v
close()
```

每个系统调用承担不同的职责。

**`socket()`：创建通信端点**

```c
int listen_fd = socket(AF_INET, SOCK_STREAM, 0);
```

成功时返回文件描述符，失败时返回 `-1`。

**`bind()`：绑定本地地址**

```c
bind(listen_fd, (struct sockaddr *)&addr, sizeof(addr));
```

服务端通常需要绑定到指定的本地 IP 地址和端口。

**`listen()`：将 Socket 设为被动监听状态**

```c
listen(listen_fd, 128);
```

它使 Socket 可以用于接受连接请求。第二个参数是待处理连接队列相关的提示值，不应简单理解为服务器最多只能服务多少客户端。

**`accept()`：接受连接**

```c
int client_fd = accept(listen_fd, NULL, NULL);
```

成功后返回一个新的 Socket 描述符，代表与某个客户端建立的连接。

原来的 `listen_fd` 继续承担监听职责。

**`recv()` 和 `send()`：收发数据**

```c
recv(client_fd, buffer, sizeof(buffer), 0);
send(client_fd, message, length, 0);
```

它们用于在已经建立的连接上接收和发送数据。需要注意返回值，因为一次调用不一定传输全部预期字节。

**`close()`：释放描述符**

```c
close(client_fd);
close(listen_fd);
```

关闭描述符会释放当前进程对相应资源的引用；TCP 连接的最终关闭行为还与其他引用、协议状态以及是否启用了相关选项有关。

### 7.2 客户端的调用流程

```text
socket()
   |
   v
connect()
   |
   v
send()/recv()
   |
   v
close()
```

客户端通常创建 Socket 后调用 `connect()`：

```c
int fd = socket(AF_INET, SOCK_STREAM, 0);

if (connect(fd, (struct sockaddr *)&server_addr,
            sizeof(server_addr)) == -1) {
    perror("connect");
    close(fd);
    return EXIT_FAILURE;
}
```

`connect()` 负责尝试建立连接。成功返回后，客户端便可以通过该 Socket 与服务端交换数据。

### 7.3 一个可运行的 TCP Echo 服务端

Echo 服务端会把客户端发送的数据原样返回。

这个例子采用 IPv4、TCP 和阻塞式 I/O，并串行处理客户端连接。它适合学习 API 流程，不是高并发服务器的最终设计。

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

static int send_all(int fd, const void *data, size_t len) {
    const char *p = data;

    while (len > 0) {
        ssize_t n = send(fd, p, len, 0);

        if (n == -1) {
            if (errno == EINTR) {
                continue;
            }
            return -1;
        }

        if (n == 0) {
            errno = EPIPE;
            return -1;
        }

        p += n;
        len -= (size_t)n;
    }

    return 0;
}

int main(void) {
    int listen_fd = socket(AF_INET, SOCK_STREAM, 0);

    if (listen_fd == -1) {
        perror("socket");
        return EXIT_FAILURE;
    }

    int opt = 1;

    if (setsockopt(listen_fd, SOL_SOCKET, SO_REUSEADDR,
                   &opt, sizeof(opt)) == -1) {
        perror("setsockopt");
        close(listen_fd);
        return EXIT_FAILURE;
    }

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));

    addr.sin_family = AF_INET;
    addr.sin_port = htons(8080);
    addr.sin_addr.s_addr = htonl(INADDR_ANY);

    if (bind(listen_fd, (struct sockaddr *)&addr,
             sizeof(addr)) == -1) {
        perror("bind");
        close(listen_fd);
        return EXIT_FAILURE;
    }

    if (listen(listen_fd, 128) == -1) {
        perror("listen");
        close(listen_fd);
        return EXIT_FAILURE;
    }

    printf("Echo server listening on port 8080\n");

    for (;;) {
        struct sockaddr_in peer_addr;
        socklen_t peer_len = sizeof(peer_addr);

        int client_fd = accept(
            listen_fd,
            (struct sockaddr *)&peer_addr,
            &peer_len
        );

        if (client_fd == -1) {
            if (errno == EINTR) {
                continue;
            }
            perror("accept");
            break;
        }

        char peer_ip[INET_ADDRSTRLEN];

        if (inet_ntop(AF_INET, &peer_addr.sin_addr,
                      peer_ip, sizeof(peer_ip)) != NULL) {
            printf("Client connected: %s:%u\n",
                   peer_ip, (unsigned)ntohs(peer_addr.sin_port));
        }

        char buffer[4096];

        for (;;) {
            ssize_t n = recv(client_fd, buffer, sizeof(buffer), 0);

            if (n == 0) {
                // 对端已关闭其发送方向，连接进入 EOF 状态。
                break;
            }

            if (n == -1) {
                if (errno == EINTR) {
                    continue;
                }

                perror("recv");
                break;
            }

            if (send_all(client_fd, buffer, (size_t)n) == -1) {
                perror("send");
                break;
            }
        }

        close(client_fd);
    }

    close(listen_fd);
    return EXIT_SUCCESS;
}
```

编译：

```bash
cc -Wall -Wextra -O2 tcp_echo_server.c -o tcp_echo_server
```

启动：

```bash
./tcp_echo_server
```

另开终端，使用系统提供的 `nc` 测试：

```bash
nc 127.0.0.1 8080
```

输入：

```text
hello
```

服务端会将收到的字节返回给客户端。

需要注意：服务端使用 `INADDR_ANY` 监听所有本地 IPv4 接口。在有真实网络连接的机器上，这意味着服务端可能可以被其他机器访问。不要在不需要时将学习服务暴露到公共网络。

### 7.4 这个服务端有哪些局限？

这个例子虽然可以运行，但它不是一个完整的生产级服务器。

首先，它一次只处理一个客户端。某个客户端如果一直不发送数据，服务端就可能一直阻塞在该连接的 `recv()` 中，其他客户端的连接请求即使已经进入内核队列，也无法被当前循环及时处理。

其次，`send_all()` 会一直尝试发送剩余数据。如果对端不再读取数据，发送操作可能阻塞很长时间。

再次，示例没有设计应用层协议、连接超时、认证、并发控制和资源配额。

因此，在实践中，可以逐步将其改造为：

1. 使用 `poll()` 或 `epoll()` 处理多个连接。
2. 将 Socket 设置为非阻塞模式。
3. 为每个连接维护独立的输入输出缓冲区。
4. 实现清晰的消息分帧协议。
5. 为连接数量、请求大小和等待时间设置限制。
6. 对客户端断开、资源耗尽和异常输入进行系统性处理。

## 八、UDP Socket：面向数据报的通信

### 8.1 UDP 与 TCP 的主要区别

UDP 是一种无连接的数据报传输协议。

TCP 通过连接提供可靠、有序的字节流传输；UDP 则将应用程序发送的数据报作为独立单元交给传输层处理。

| 对比维度 | TCP | UDP |
|---|---|---|
| 连接模型 | 面向连接 | 无连接 |
| 数据形式 | 字节流 | 数据报 |
| 应用层消息边界 | 需要自行定义 | 保留数据报边界 |
| 可靠性 | 提供可靠、有序的字节流传输 | 不保证交付、顺序或不重复 |
| 丢包处理 | 协议栈负责重传等机制 | 应用按需求设计 |
| 通信开销 | 通常有连接维护和更多状态 | 通常更轻量 |
| 典型场景 | HTTP、SSH、数据库连接等 | DNS、实时媒体、部分游戏通信等 |

这里的“UDP 通常更轻量”并不代表它在所有情况下都更快。实际性能取决于报文大小、网络条件、拥塞、应用协议和实现方式。

### 8.2 创建 UDP Socket

```c
int fd = socket(AF_INET, SOCK_DGRAM, 0);
```

UDP 服务端通常绑定本地地址和端口：

```c
bind(fd, (struct sockaddr *)&addr, sizeof(addr));
```

接收数据时可以使用：

```c
recvfrom(fd, buffer, sizeof(buffer), 0,
         (struct sockaddr *)&peer_addr, &peer_len);
```

发送数据时可以使用：

```c
sendto(fd, message, length, 0,
       (struct sockaddr *)&peer_addr, peer_len);
```

与 TCP 不同，典型 UDP 服务端不需要调用 `listen()` 和 `accept()`。

每个数据报都包含自己的边界，接收方也可以从 `recvfrom()` 获取发送方的地址。

### 8.3 UDP Echo 服务端

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

int main(void) {
    int fd = socket(AF_INET, SOCK_DGRAM, 0);

    if (fd == -1) {
        perror("socket");
        return EXIT_FAILURE;
    }

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof(addr));

    addr.sin_family = AF_INET;
    addr.sin_port = htons(8081);
    addr.sin_addr.s_addr = htonl(INADDR_ANY);

    if (bind(fd, (struct sockaddr *)&addr, sizeof(addr)) == -1) {
        perror("bind");
        close(fd);
        return EXIT_FAILURE;
    }

    printf("UDP Echo server listening on port 8081\n");

    for (;;) {
        char buffer[2048];
        struct sockaddr_in peer;
        socklen_t peer_len = sizeof(peer);

        ssize_t n = recvfrom(
            fd,
            buffer,
            sizeof(buffer),
            0,
            (struct sockaddr *)&peer,
            &peer_len
        );

        if (n == -1) {
            if (errno == EINTR) {
                continue;
            }
            perror("recvfrom");
            break;
        }

        ssize_t sent = sendto(
            fd,
            buffer,
            (size_t)n,
            0,
            (struct sockaddr *)&peer,
            peer_len
        );

        if (sent == -1) {
            perror("sendto");
        } else if (sent != n) {
            fprintf(stderr, "Unexpected partial datagram send\n");
        }
    }

    close(fd);
    return EXIT_SUCCESS;
}
```

编译：

```bash
cc -Wall -Wextra -O2 udp_echo_server.c -o udp_echo_server
```

这个示例使用一个固定大小的缓冲区。对于 UDP，必须考虑接收缓冲区大小与最大数据报大小之间的关系；在 Linux 上，如果数据报超过接收缓冲区，可能会发生截断。需要完整处理较大数据报时，应采用适当的缓冲区和接口，并检查相关标志。

还要注意，UDP 发送成功通常只意味着本机协议栈接受了待发送数据，并不代表远端应用已经收到或处理它。

如果应用要求可靠交付，就需要自行设计确认、重传、去重、超时和流量控制等机制，或者选择提供相应能力的协议。

## 九、TCP 的字节流语义：为什么必须设计应用层协议？

这是 Socket 编程中最重要、也最容易犯错的部分之一。

### 9.1 一次发送不等于一次接收

假设客户端发送：

```c
send(fd, "HELLO", 5, 0);
```

程序员可能会误以为服务端的一次 `recv()` 必然返回 5 个字节。

实际上，TCP 提供的是字节流，而不是消息队列。

如果发送端依次发送：

```text
消息 A：HELLO
消息 B：WORLD
```

接收端可能看到：

```text
HELLOWORLD
```

也可能看到：

```text
HEL
LOWORLD
```

甚至可能先收到 `HELLO`，过一段时间再收到 `WORLD`。

这些情况都不违反 TCP 的基本语义。

### 9.2 如何划分消息边界？

应用层必须自行设计协议。常见方案有以下几种。

**方案一：固定长度消息**

如果每条消息都是固定的 64 字节，那么接收端累计读取 64 字节即可得到一条完整消息。

优点是简单；缺点是长度固定，灵活性较差。

**方案二：分隔符协议**

例如以换行符结束一条消息：

```text
LOGIN alice\n
PING\n
QUIT\n
```

接收端不断读取数据并缓存，直到发现换行符。

这种方案适合简单文本协议，但需要处理转义、编码以及超长行等问题。

**方案三：长度前缀协议**

每条消息先发送一个固定长度的头部，头部包含后续负载的字节数。

例如：

```text
+------------------+---------------------+
| 4 字节长度字段   | 实际消息内容        |
+------------------+---------------------+
```

如果长度字段表示后续负载为 100 字节，接收端就必须继续累计读取，直到得到完整的 100 字节负载。

这种设计适合二进制协议，也便于进行消息大小限制。

**方案四：自描述格式**

例如 JSON、Protocol Buffers 等格式，可以表达结构化数据。不过，使用这些格式并不自动解决 TCP 分帧问题：接收端仍然需要知道一条完整消息在哪里结束，通常会结合长度前缀、分隔符或其他外层协议。

### 9.3 读取完整数据的基本模式

对于阻塞式 TCP Socket，可以编写一个辅助函数，确保在对端持续提供数据且没有发生错误的前提下，尽可能读取指定长度。

```c
#include <unistd.h>
#include <errno.h>
#include <stddef.h>
#include <sys/types.h>

ssize_t read_exact(int fd, void *buffer, size_t length) {
    char *p = buffer;
    size_t total = 0;

    while (total < length) {
        ssize_t n = read(fd, p + total, length - total);

        if (n > 0) {
            total += (size_t)n;
            continue;
        }

        if (n == 0) {
            // 对端关闭连接；可能只收到部分数据。
            return (ssize_t)total;
        }

        if (errno == EINTR) {
            continue;
        }

        return -1;
    }

    return (ssize_t)total;
}
```

调用者必须区分：

- 返回 `length`：读取到了全部指定长度。
- 返回 `0`：在尚未读取任何字节前就遇到 EOF。
- 返回介于 `1` 和 `length - 1` 之间的值：读取了一部分数据后遇到 EOF。
- 返回 `-1`：发生错误。

如果函数返回正数但小于 `length`，调用者不能把这段数据当作完整消息。

非阻塞 Socket 的处理会更复杂，因为 `EAGAIN` 或 `EWOULDBLOCK` 表示当前暂时无法继续读取，需要等待后续就绪事件，而不是简单地把它当作连接失败。

### 9.4 为什么不能直接发送 C 结构体？

一个常见的错误是直接把内存中的结构体当作网络协议：

```c
struct Message {
    int type;
    int length;
    char data[128];
};
```

然后：

```c
send(fd, &message, sizeof(message), 0);
```

这种方式在受控环境下有时能够工作，但不适合作为通用网络协议，原因包括：

- 不同平台的整数宽度可能不同。
- 不同编译器或 ABI 可能使用不同的结构体布局。
- 结构体可能包含填充字节。
- 多字节整数的字节序可能不同。
- 字符串不一定以空字符结尾。
- 未校验长度时，接收端可能出现越界访问。
- 不同版本程序之间可能存在兼容性问题。

更可靠的方法是明确定义协议字段的宽度、字节序、字段顺序和长度约束，然后显式编码与解码。

## 十、网络字节序与地址转换

### 10.1 什么是网络字节序？

不同 CPU 架构对多字节整数的内存排列方式可能不同。

常见的两种方式是：

- 小端序（Little Endian）：低有效字节放在低地址。
- 大端序（Big Endian）：高有效字节放在低地址。

网络协议通常使用网络字节序，即大端序，来表示某些多字节数值。

因此，在构造 IPv4 Socket 地址时，经常会看到：

```c
addr.sin_port = htons(8080);
addr.sin_addr.s_addr = htonl(INADDR_ANY);
```

其中：

- `htons()`：将 16 位整数从主机字节序转换为网络字节序。
- `htonl()`：将 32 位整数从主机字节序转换为网络字节序。
- `ntohs()`：将 16 位整数从网络字节序转换为主机字节序。
- `ntohl()`：将 32 位整数从网络字节序转换为主机字节序。

端口号是 16 位整数，因此使用 `htons()`。

IPv4 地址字段是 32 位，因此常见的数值形式需要与 `htonl()` 或相应的地址转换接口配合使用。

### 10.2 地址字符串转换

对于 IPv4 地址，可以使用：

```c
inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);
```

对于 IPv6 地址，可以使用：

```c
inet_pton(AF_INET6, "::1", &addr6.sin6_addr);
```

反向转换可以使用 `inet_ntop()`。

与历史上的 `inet_addr()` 等接口相比，`inet_pton()` 和 `inet_ntop()` 更适合现代 IPv4/IPv6 程序。

如果需要解析域名并获取地址列表，可以使用 `getaddrinfo()`，而不是假定主机名一定对应某一个 IPv4 地址。

## 十一、连接关闭与半关闭

### 11.1 `close()` 的含义

关闭 Socket 描述符：

```c
close(fd);
```

表示当前进程不再通过这个描述符访问对应资源。

如果其他描述符或进程仍然持有该 Socket 的引用，底层资源可能不会立即释放。

对于 TCP，关闭连接还涉及 TCP 协议状态转换、发送缓冲区中的数据以及对端的处理情况。因此，不应把 `close()` 简化理解为“对端立即停止工作”。

### 11.2 `shutdown()` 的用途

`shutdown()` 可以关闭 Socket 的某个通信方向：

```c
shutdown(fd, SHUT_RD);
shutdown(fd, SHUT_WR);
shutdown(fd, SHUT_RDWR);
```

其中：

- `SHUT_RD`：关闭本端的接收方向。
- `SHUT_WR`：关闭本端的发送方向。
- `SHUT_RDWR`：关闭两个方向。

例如，客户端发送完请求后，可以使用：

```c
shutdown(fd, SHUT_WR);
```

告诉对端本端不再发送数据，但仍然可以继续接收对端的响应。

这对一些请求—响应协议很有用：客户端发送完请求后发送 FIN，服务端读到 EOF，随后完成处理并返回结果。

不过，`shutdown()` 是针对 Socket 连接方向的操作，不等同于关闭当前描述符。调用者通常仍需在适当的时候执行 `close()`。

### 11.3 EOF 与连接断开

对于 TCP，`recv()` 返回 `0` 通常表示对端已经有序关闭了发送方向，且当前没有更多数据可读。

但这不意味着本端一定不能再发送数据。TCP 连接的两个方向可以独立关闭，因此需要结合协议状态判断后续行为。

对于管道，当所有写端关闭且缓冲区中的数据被读完时，读端也会观察到 EOF。

虽然两者都通过 `read()` 或 `recv()` 返回 `0` 来表示读到 EOF，但底层通信机制和生命周期语义并不完全相同。

## 十二、阻塞 I/O、非阻塞 I/O 与多路复用

### 12.1 阻塞 I/O

默认情况下，许多文件描述符使用阻塞式 I/O。

例如：

```c
ssize_t n = recv(fd, buffer, sizeof(buffer), 0);
```

如果暂时没有数据可读，调用可能会等待，直到有数据、连接状态发生变化或出现错误。

阻塞 I/O 的优点是编程模型直观，但如果一个线程需要处理大量连接，为每个连接都使用一个阻塞线程可能会带来较高的资源开销。

### 12.2 非阻塞 I/O

可以通过 `fcntl()` 将描述符设置为非阻塞模式：

```c
#include <fcntl.h>

int flags = fcntl(fd, F_GETFL, 0);

if (flags == -1) {
    perror("fcntl F_GETFL");
} else if (fcntl(fd, F_SETFL, flags | O_NONBLOCK) == -1) {
    perror("fcntl F_SETFL");
}
```

非阻塞模式下，如果操作当前无法完成，系统调用通常会返回 `-1`，并将 `errno` 设置为 `EAGAIN` 或 `EWOULDBLOCK`。

这并不意味着连接发生了故障，而是表示当前没有足够条件立即完成操作。

因此，非阻塞 I/O 通常需要配合就绪通知机制使用。

### 12.3 `select()`、`poll()` 与 `epoll()`

这些机制允许程序等待多个文件描述符上的 I/O 条件。

- `select()`：经典的 I/O 多路复用接口。
- `poll()`：使用数组描述需要关注的描述符。
- `epoll()`：Linux 提供的事件通知机制，适合管理大量连接。

一个典型的事件驱动服务器可能按以下流程工作：

```text
创建监听 Socket
       |
       v
设置非阻塞模式
       |
       v
注册到 epoll
       |
       v
等待就绪事件
       |
       +------ 监听 Socket 可读
       |              |
       |              v
       |          accept 新连接
       |
       +------ 客户端 Socket 可读
       |              |
       |              v
       |          读取并解析请求
       |
       +------ 客户端 Socket 可写
                      |
                      v
                 发送待处理数据
```

这里的“可读”不一定表示一定存在普通业务数据。例如，连接关闭或某些错误条件也可能导致 Socket 被报告为可读，因此事件处理代码仍然必须检查系统调用的返回值。

对于非阻塞 TCP，应用程序还需要维护连接状态、输入缓冲区和输出缓冲区。不能在每次事件到达时就假定已经获得完整消息。

## 十三、`errno`、系统调用返回值与健壮性

IPC 程序通常需要处理失败路径，因为连接可能失败，进程可能退出，系统资源也可能耗尽。

### 13.1 常见返回值约定

| 系统调用 | 成功时 | 失败时或特殊情况 |
|---|---|---|
| `socket()` | 非负文件描述符 | `-1` |
| `pipe()` | `0` | `-1` |
| `fork()` | 父进程返回子 PID，子进程返回 `0` | `-1` |
| `read()` | 实际读取字节数 | `-1`；读到 EOF 时为 `0` |
| `write()` | 实际写入字节数 | `-1` |
| `accept()` | 新连接的文件描述符 | `-1` |
| `connect()` | `0` | `-1` |
| `recv()` | 实际接收字节数 | `-1`；有序关闭时通常为 `0` |
| `waitpid()` | 返回被等待的子进程 PID | `-1` |

不能只检查是否返回 `-1`，还需要理解每个调用的特殊语义。

### 13.2 为什么需要处理 `EINTR`？

某些阻塞系统调用可能被信号中断，并以 `-1` 返回，同时将 `errno` 设置为 `EINTR`。

例如：

```c
ssize_t n = read(fd, buffer, sizeof(buffer));

if (n == -1 && errno == EINTR) {
    // 根据操作语义决定是否重试。
}
```

对于许多简单的阻塞读写操作，如果希望继续等待数据，可以在 `EINTR` 时重试。

但不应该机械地重试所有系统调用。某些操作在被中断时可能已经产生了可观察的副作用，或者其语义要求应用程序重新判断当前状态。

对于 `connect()` 等连接操作，更应结合实际连接状态和接口语义处理错误，而不是一概立即重试。

### 13.3 为什么需要处理部分读写？

假设程序需要发送 1000 字节：

```c
ssize_t n = write(fd, buffer, 1000);
```

即使调用成功，返回值也可能小于 1000。

如果程序直接认为全部数据已经发送，就会丢失未发送的部分。

正确的方式是记录已经完成的字节数，并继续处理剩余内容。前文的 `send_all()` 就演示了这种思路。

对于非阻塞 I/O，如果遇到 `EAGAIN` 或 `EWOULDBLOCK`，则应将剩余数据保存在输出缓冲区中，等待后续可写事件，再继续发送。

### 13.4 `SIGPIPE` 与 `EPIPE`

当程序向没有读者的管道写入数据时，系统通常会产生 `SIGPIPE` 信号。如果信号采用默认处理方式，进程可能会终止。

在一些 Socket 场景中，向已经关闭连接的对端发送数据也可能遇到类似问题，具体行为取决于平台和连接状态。

因此，服务器程序需要明确考虑信号处理策略，或者在平台支持的情况下使用适当的发送标志，例如 Linux 上的 `MSG_NOSIGNAL`。

即使忽略或处理了 `SIGPIPE`，写操作仍然可能失败并返回 `EPIPE`，调用者仍然需要处理错误。

## 十四、进程间通信机制的选择

理解不同机制的语义后，就可以根据实际需求做出选择。

| 机制 | 通信范围 | 消息边界 | 主要优势 | 常见用途 |
|---|---|---|---|---|
| 匿名管道 | 本机，常见于相关进程 | 字节流 | 简单，适合流水线 | Shell 管道、父子进程通信 |
| FIFO | 本机 | 字节流 | 通过路径名访问 | 无亲缘关系进程之间的简单通信 |
| `socketpair()` | 本机 | 取决于 Socket 类型 | 双向通信，创建简单 | 父子进程控制通道 |
| Unix Domain Socket | 本机 | 取决于类型 | 支持本地客户端—服务端模型 | 守护进程、数据库、服务组件 |
| TCP Socket | 可跨主机 | 字节流 | 可靠、有序的传输 | HTTP、SSH、数据库协议 |
| UDP Socket | 可跨主机 | 数据报 | 保留数据报边界，协议开销通常较低 | DNS、实时通信等 |
| 共享内存 | 本机 | 应用自行定义 | 适合大量数据的高效共享 | 数据交换、缓存、图像处理 |
| 消息队列 | 通常本机 | 依机制定义 | 结构化消息交换 | 任务分发、异步处理 |

### 14.1 什么时候选择管道？

如果只是需要把一个程序的输出传给另一个程序，管道通常最合适。

例如：

```bash
cat access.log | grep "ERROR" | sort
```

Shell 可以创建多个进程并将它们的标准输入、标准输出连接起来。

这正体现了 Unix 的组合式设计：每个程序只负责一个相对独立的任务，数据通过管道流动。

### 14.2 什么时候选择 Unix Domain Socket？

如果两个进程在同一台机器上运行，并且需要类似客户端—服务端的交互模型，Unix Domain Socket 通常是很好的选择。

例如：

- 应用程序向后台守护进程发送命令。
- 数据库客户端连接本机数据库服务。
- 多个系统组件通过本地接口协作。
- 需要在本地进程之间传递文件描述符。

在 Linux 中，Unix Domain Socket 的某些形式还支持传递文件描述符，这使它不仅能传递字节，还能传递对内核资源的访问能力。

### 14.3 什么时候选择 TCP？

如果通信双方可能位于不同主机，并且需要可靠、有序的字节流传输，TCP 通常是合理的选择。

不过，TCP 只解决传输层的问题，不会自动提供应用程序需要的所有能力。

例如，TCP 不会自动提供：

- 用户身份认证。
- 业务请求与响应的匹配。
- 消息边界。
- 业务级重试。
- 幂等性保证。
- 应用层权限控制。

这些需要由上层协议和应用程序设计负责。

### 14.4 什么时候选择共享内存？

如果两个进程需要交换大量数据，共享内存可能比通过管道或 Socket 反复复制数据更高效。

但共享内存主要解决的是数据如何被多个进程访问，而不是完整的同步和通信协议问题。

多个进程可能同时读取或修改共享区域，因此通常还需要配合互斥锁、信号量、原子操作或其他同步手段。

此外，开发者必须自行定义共享数据结构、生命周期、错误恢复和版本兼容策略。

**共享内存不等于自动安全的并发数据结构。** 它减少了某些数据传输成本，同时把更多同步责任交给了应用程序。

## 十五、从内核视角理解 IPC

前面的示例主要站在应用程序角度介绍系统调用。要进一步理解 Unix/Linux，可以从内核的职责来分析 IPC。

### 15.1 文件描述符表

每个进程拥有自己的文件描述符表。描述符表将小整数映射到相应的内核资源引用。

例如，进程 A 中的 `fd = 3` 与进程 B 中的 `fd = 3` 不一定代表同一个资源。

描述符的数值只在对应进程的上下文中有意义。

当 `fork()` 发生时，子进程会继承父进程的描述符引用，但双方仍然拥有各自的描述符表。

这解释了为什么两个进程可以用不同的描述符数字引用同一个通信对象，也解释了为什么描述符泄漏会影响管道的 EOF 或 Socket 的生命周期。

### 15.2 内核缓冲区

对于管道、TCP Socket 等机制，内核通常会管理用于暂存数据的缓冲区。

发送方将数据交给内核后，内核根据通信机制的语义处理这些数据；接收方则通过读取操作取得数据。

但是，不能把这一过程简单理解为“发送方调用一次 `write()`，内核就将数据原样复制给接收方的一次 `read()`”。

内核缓冲、协议处理、调度时机以及接收端的读取长度都会影响应用程序观察到的数据分段方式。

这也是 TCP 字节流不保留应用层消息边界的原因之一。

### 15.3 通信端点与协议状态

Socket 除了关联数据缓冲区，还可能关联本地地址、远端地址、连接状态、协议控制信息和其他内核数据结构。

TCP 连接需要维护连接状态、序列号、确认信息、重传与流量控制等状态。

UDP 不维护与 TCP 相同的连接状态机，但仍需要处理地址、报文、缓冲区以及相应的协议控制信息。

因此，虽然管道、Socket 和普通文件都可以通过文件描述符进行 I/O 操作，但它们在内核中的实现和行为并不相同。

### 15.4 IPC 为什么会涉及进程调度？

当一个进程在阻塞式 I/O 上等待时，内核可能将它置于等待状态，并调度其他可运行进程。

例如：

1. 进程 A 尝试从空管道读取数据。
2. 管道中没有数据，但仍然存在写端。
3. 内核让进程 A 等待。
4. 进程 B 向管道写入数据。
5. 内核使等待中的进程 A 有机会继续运行。
6. 进程 A 重新取得数据。

这说明 IPC 不仅是数据传输问题，也涉及等待队列、唤醒机制、进程状态转换和调度。

学习操作系统时，可以将这些现象与进程调度、系统调用、中断和同步原语联系起来。

## 十六、常见错误与调试方法

### 16.1 程序一直阻塞在 `read()`

可能原因：

- 管道当前没有数据，但仍有写端存在。
- Socket 连接尚未收到数据。
- 对端没有按照协议发送完整消息。
- 程序误以为某次写入会自动形成一条完整消息。

排查方法：

- 检查所有相关描述符是否正确关闭。
- 检查发送端是否真的发送了数据。
- 使用 `strace` 观察系统调用及其返回值。
- 在 TCP 场景中，检查应用层协议的长度字段和分帧逻辑。
- 对可能永久等待的操作设置合理的超时或取消机制。

### 16.2 `accept()` 返回错误

常见原因包括：

- 监听 Socket 创建失败。
- `bind()` 失败，例如端口已被占用。
- `listen()` 未成功。
- 系统调用被信号中断。
- 资源耗尽或发生其他网络错误。

排查时应当检查每个系统调用的返回值，并在失败后立即读取 `errno` 或使用 `perror()` 输出错误信息。

### 16.3 客户端连接失败

可能原因：

- 服务端没有启动。
- 客户端使用了错误的 IP 地址或端口。
- 服务端只监听了某个接口，而客户端访问的是另一个接口。
- 防火墙或网络策略阻止了连接。
- 服务端监听队列或资源出现问题。

可以使用：

```bash
ss -lnt
```

检查本机 TCP 监听状态。

还可以通过：

```bash
strace -f ./your_program
```

观察程序执行了哪些系统调用，以及调用在哪里失败或阻塞。

### 16.4 子进程退出后父进程仍然等待

需要区分两种情况：

- 父进程阻塞在 `read()`，等待管道 EOF 或更多数据。
- 父进程阻塞在 `waitpid()`，等待子进程结束。

如果是前者，检查是否有进程仍然持有管道写端。

如果是后者，检查子进程是否真的退出，是否阻塞在其他系统调用，以及父进程是否等待了正确的 PID。

在需要回收子进程的程序中，正确处理 `wait()` 或 `waitpid()` 也很重要，否则已结束的子进程可能留下僵尸进程。

## 十七、实践练习：从 API 到真正理解 IPC

如果目标是掌握 Linux 系统编程，建议按下面的顺序完成练习。每个练习都对应一种新的系统机制或需要重点理解的语义。

### 练习一：实现自己的 `cat`

实现一个简化版文件输出程序：

```bash
./mycat file.txt
```

要求：

- 使用 `open()`、`read()`、`write()` 和 `close()`。
- 正确处理部分读写。
- 正确处理系统调用错误。
- 支持较大的文件，而不是一次性将整个文件读入内存。

重点：文件描述符和基本 I/O。

### 练习二：实现管道通信

编写一个父子进程程序：

- 父进程读取用户输入。
- 父进程将输入写入管道。
- 子进程读取数据并进行转换，例如将小写字母转为大写。
- 子进程将结果写回标准输出。

重点：`fork()`、描述符继承、关闭不需要的管道端、EOF 和部分读写。

### 练习三：实现双向 IPC

使用 `socketpair(AF_UNIX, SOCK_STREAM, 0, sv)`：

- 父进程向子进程发送请求。
- 子进程计算请求结果。
- 子进程将响应发回父进程。
- 支持多条请求和响应。

重点：双向通信、协议分帧和连接生命周期。

### 练习四：实现 Unix Domain Socket 服务

编写一个本地服务端和独立客户端：

- 服务端创建 Unix Domain Socket。
- 客户端通过路径名连接。
- 客户端发送命令。
- 服务端返回结果。
- 正确处理 Socket 文件路径的创建、权限和清理。

重点：无亲缘关系进程通信、地址命名和访问控制。

### 练习五：实现 TCP Echo 服务

将前面的服务改为 TCP：

- 支持多个客户端。
- 支持并发处理。
- 正确处理部分读写。
- 设计明确的消息边界。
- 能够检测客户端断开。
- 对异常客户端设置合理的资源限制。

重点：TCP 字节流、连接管理和并发 I/O。

### 练习六：实现带长度前缀的协议

定义一个简单的二进制协议：

```text
+-------------------+-----------------------+
| 4 字节负载长度    | 指定长度的消息负载    |
+-------------------+-----------------------+
```

要求：

- 规定长度字段的字节序。
- 验证消息长度是否合法。
- 处理不完整的消息头。
- 处理不完整的消息体。
- 限制最大消息长度。
- 对非法输入返回错误，而不是越界访问。

重点：应用层协议、编码与解码、健壮性和安全性。

### 练习七：从阻塞 I/O 改为 `epoll`

在 TCP Echo 服务端的基础上：

- 为监听 Socket 和客户端 Socket 设置非阻塞模式。
- 使用 `epoll` 监听事件。
- 为每个客户端保存输入和输出缓冲区。
- 在可读事件中读取数据。
- 在可写事件中发送待处理数据。
- 正确处理 `EAGAIN`、`EINTR`、EOF 和连接错误。

重点：事件驱动模型、连接状态管理和高并发网络编程。

## 十八、推荐的学习资料

### 18.1 从经典 IPC 教程开始

本文讨论的原始手册：

[An Introductory 4.4BSD Interprocess Communication Tutorial](https://docs-archive.freebsd.org/44doc/psd/20.ipctut/paper.pdf)

它的价值在于用较小的例子解释管道、Socket Pair、Socket 以及数据报与流式通信之间的差异。阅读时应将其作为 Unix IPC 的概念性入门材料，而不是直接当作现代 Linux API 的完整参考。

### 18.2 继续阅读高级 Unix 编程资料

推荐进一步学习：

- **Advanced Programming in the UNIX Environment（APUE）**：系统学习文件 I/O、进程、信号、IPC、线程和网络编程。
- **The Linux Programming Interface（TLPI）**：深入了解 Linux 系统调用、文件描述符、进程、IPC 和相关机制。
- **Unix Network Programming**：重点学习 TCP/UDP Socket、网络 I/O、地址转换和服务器设计。
- **The Design and Implementation of the 4.4BSD Operating System**：从操作系统内部实现的角度理解 Socket、网络协议和进程间通信。

其中，APUE 和 TLPI 适合建立系统编程的整体知识体系；Unix Network Programming 则适合进一步深入网络编程。

## 十九、总结

Unix/Linux IPC 的核心并不是记住多少个函数，而是理解每种通信机制提供了什么语义，以及应用程序需要为哪些事情负责。

可以用以下思路总结：

1. **文件描述符**提供统一的资源访问入口。
2. **`fork()` 和描述符继承**使相关进程能够共享通信资源的引用。
3. **匿名管道和 FIFO**适合简单的本地字节流通信。
4. **`socketpair()`**适合建立本地双向通信通道。
5. **Unix Domain Socket**提供本机客户端—服务端通信能力。
6. **TCP Socket**提供可靠、有序的字节流传输，但不提供应用层消息边界。
7. **UDP Socket**以数据报为单位传输，但不保证交付、顺序或不重复。
8. **共享内存**适合高效交换大量数据，但需要额外设计同步与数据结构。
9. **非阻塞 I/O 和多路复用**能够帮助程序处理大量并发连接，但需要维护连接状态与缓冲区。
10. **错误处理、资源生命周期和协议设计**决定 IPC 程序能否在真实环境中可靠运行。

如果你正在系统学习 C/Linux 编程，建议先掌握管道、`fork()` 和文件描述符继承，再完成 Socket Pair 与 Unix Domain Socket，最后实现 TCP/UDP 服务端。这样可以从最基础的内核 I/O 抽象逐步过渡到网络协议和高并发服务器设计。


## 参考资料

- Stuart Sechrest, *An Introductory 4.4BSD Interprocess Communication Tutorial*. [原文 PDF](https://docs-archive.freebsd.org/44doc/psd/20.ipctut/paper.pdf)
- [The Linux Programming Interface](https://man7.org/tlpi/)
- Linux 手册：`man 2 pipe`、`man 2 fork`、`man 2 socketpair`、`man 2 socket`、`man 2 accept`、`man 2 connect`
- [Beej's Guide to Network Programming](https://beej.us/guide/bgnet/)

---

*本文主要介绍 IPC 的基础模型。BSD 4.4 的原始示例可能使用了旧式 C 语法或历史接口；实际 Linux 项目应以当前系统的手册页和 POSIX 规范为准。*