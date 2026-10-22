---
title: "[翻译]BSD Socket编程入门"
date: '2026-10-22T15:27:57+08:00'
draft: false
tags: ["C语言", "Linux", "Socket", "TCP", "网络编程"]
categories: ["计算机网络"]
description: "从零理解 BSD Socket API，掌握 TCP 客户端与服务端的工作流程、数据读写、连接关闭和网络字节序。"
---

> 本文是一篇基于 BSD Socket 基本概念整理的原创中文教程，参考了 Jim Frost 的 *BSD Sockets: A Quick And Dirty Primer*，并结合现代 POSIX/Linux 编程实践重新组织内容。
>
> 原文：[BSD Sockets: A Quick And Dirty Primer](https://cis.temple.edu/~ingargio/old/cis307s96/readings/docs/sockets.html)
>
> 原文版权信息：Jim Frost，Copyright © 1988, 1994，All Rights Reserved。本文不构成原文的逐字翻译或全文转载。

## 一、什么是 Socket？

Socket（套接字）是操作系统提供的一种通信接口，允许两个进程交换数据。

两个进程可以运行在同一台机器上，也可以运行在通过网络连接的不同机器上。应用程序通过 Socket API 与操作系统交互，由操作系统负责底层的网络通信。

可以把 Socket 理解为通信的端点：

- 应用程序通过 Socket 发送和接收数据。
- 操作系统负责协议处理、数据传输和连接管理。
- TCP、UDP 等传输协议决定数据传输的语义。

在 Linux 中，Socket 通常由一个文件描述符表示，因此可以使用 `read()`、`write()` 和 `close()` 等文件 I/O 接口操作它。

不过，Socket 并不完全等同于普通文件：网络通信存在连接建立、数据分段、传输失败、对端关闭和超时等特殊问题。

### 1.1 两种常见的 Socket 类型

最常见的两种 Internet Socket 是 TCP Socket 和 UDP Socket。

| 特性 | TCP：`SOCK_STREAM` | UDP：`SOCK_DGRAM` |
|---|---|---|
| 传输模式 | 字节流 | 数据报 |
| 是否需要建立连接 | 需要建立 TCP 连接 | 不需要建立连接 |
| 可靠性 | 提供可靠、有序的字节流传输 | 不保证可靠送达和顺序 |
| 消息边界 | 不保留应用层消息边界 | 保留数据报边界 |
| 常见用途 | HTTP、SSH、数据库连接 | DNS、实时音视频、部分游戏通信 |

本文主要介绍 TCP，因为它能帮助我们理解客户端—服务端通信的基本流程。

### 1.2 IP 地址和端口

网络应用通常通过 IP 地址和端口来定位通信端点。

- IP 地址标识网络中的主机或网络接口。
- 端口标识主机上由传输层协议区分的通信端点。
- TCP 连接通常由源 IP、源端口、目的 IP 和目的端口共同区分；协议类型也是连接标识的一部分。

例如：

```text
客户端：192.0.2.10:52000
服务端：192.0.2.20:8080
```

客户端使用临时端口 `52000`，连接服务端的 `8080` 端口。

实际开发中，不应该依赖固定的客户端临时端口。

## 二、建立 TCP 服务端

TCP 服务端的基本任务是：

1. 创建 Socket。
2. 将 Socket 绑定到本地地址和端口。
3. 开始监听连接请求。
4. 接受客户端连接。
5. 与客户端交换数据。
6. 关闭连接，并继续处理其他客户端。

对应的 API 调用顺序为：

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
read() / write()
   |
   v
close()
```

### 2.1 创建 Socket：socket()

```c
#include <sys/socket.h>

int fd = socket(AF_INET, SOCK_STREAM, 0);
```

主要参数如下：

- `AF_INET`：使用 IPv4 地址族。
- `SOCK_STREAM`：使用面向连接的字节流 Socket。
- `0`：让系统选择与该地址族和 Socket 类型对应的默认协议，通常是 TCP。

调用成功时返回一个非负文件描述符，失败时返回 `-1`。

### 2.2 绑定地址：bind()

创建 Socket 后，服务端通常需要指定监听地址和端口。

```c
#include <arpa/inet.h>
#include <netinet/in.h>
#include <string.h>

struct sockaddr_in addr;
memset(&addr, 0, sizeof(addr));

addr.sin_family = AF_INET;
addr.sin_port = htons(8080);
addr.sin_addr.s_addr = htonl(INADDR_ANY);
```

这里需要注意：

- `sin_family` 指定 IPv4。
- `sin_port` 是网络字节序的端口号。
- `INADDR_ANY` 表示监听本机所有适用的 IPv4 网络接口。

随后调用：

```c
if (bind(fd, (struct sockaddr *)&addr, sizeof(addr)) == -1) {
    /* 处理错误 */
}
```

如果端口已经被占用、地址不可用或者权限不足，`bind()` 就可能失败。

实际开发时，服务端应该检查错误并释放已经创建的资源。

### 2.3 开始监听：listen()

```c
if (listen(fd, 128) == -1) {
    /* 处理错误 */
}
```

`listen()` 将绑定后的 TCP Socket 转为被动监听状态，使内核能够为它处理传入的连接请求。

第二个参数 `128` 是等待接受的连接队列长度提示，并不代表服务端最多只能同时服务 128 个客户端。实际队列长度还受到操作系统配置和实现的影响。

### 2.4 接受连接：accept()

```c
int client_fd = accept(fd, NULL, NULL);
```

`accept()` 从监听 Socket 对应的待处理连接中接受一个连接，并返回新的 Socket 文件描述符。

这里有两个不同的描述符：

- `fd`：监听 Socket，通常持续用于接受新连接。
- `client_fd`：已连接 Socket，用于和某一个客户端交换数据。

服务端可以保留监听 Socket，继续接受其他客户端，而把已连接 Socket 交给独立线程、进程或事件循环处理。

## 三、建立 TCP 客户端

客户端的流程更简单：

1. 创建 Socket。
2. 指定服务端地址。
3. 调用 `connect()`。
4. 收发数据。
5. 关闭连接。

```text
socket()
   |
   v
connect()
   |
   v
write() / read()
   |
   v
close()
```

### 3.1 使用 connect() 连接服务端

```c
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <string.h>

int fd = socket(AF_INET, SOCK_STREAM, 0);

struct sockaddr_in server_addr;
memset(&server_addr, 0, sizeof(server_addr));

server_addr.sin_family = AF_INET;
server_addr.sin_port = htons(8080);

if (inet_pton(AF_INET, "127.0.0.1",
              &server_addr.sin_addr) != 1) {
    /* 处理地址转换错误 */
}

if (connect(fd, (struct sockaddr *)&server_addr,
            sizeof(server_addr)) == -1) {
    /* 处理连接错误 */
}
```

`connect()` 成功后，客户端就可以通过这个 Socket 与服务端通信。

上面的示例使用 IPv4 数字地址。真实应用如果需要支持域名和 IPv6，通常应使用 `getaddrinfo()` 获取地址，再依次尝试连接。

## 四、如何在 Socket 上收发数据？

TCP Socket 可以使用 `read()` 和 `write()`，也可以使用 `recv()` 和 `send()`。

但这里有一个非常重要的区别：**TCP 提供的是字节流，不是消息队列。**

假设客户端发送：

```text
Hello
World
```

服务端不一定会在一次 `read()` 中得到完整的 `Hello` 或 `World`。它可能一次读到 `HelloWorld`，也可能分多次读取。

TCP 不会自动保留应用程序每次调用 `send()` 时的消息边界。

### 4.1 处理部分读取

如果程序需要读取指定数量的字节，就必须循环读取，直到读满、连接结束或发生错误。

```c
#include <errno.h>
#include <stddef.h>
#include <unistd.h>

ssize_t read_full(int fd, void *buf, size_t count)
{
    size_t done = 0;
    char *p = buf;

    while (done < count) {
        ssize_t n = read(fd, p + done, count - done);

        if (n > 0) {
            done += (size_t)n;
        } else if (n == 0) {
            /* 对端已关闭连接，尚未读满 */
            break;
        } else if (errno == EINTR) {
            continue;
        } else {
            return -1;
        }
    }

    return (ssize_t)done;
}
```

这个函数最多读取 `count` 个字节，并返回实际读取的数量。

- 返回值等于 `count`：读取完成。
- 返回值小于 `count`：对端关闭连接，导致提前结束。
- 返回 `-1`：发生错误。

这个示例适用于阻塞式 Socket。非阻塞 Socket 还需要处理 `EAGAIN` 或 `EWOULDBLOCK` 等情况。

### 4.2 处理部分写入

`write()` 也不保证一次写入所有请求的数据。因此，如果应用程序需要确保全部数据都交给内核，就应循环写入。

```c
#include <errno.h>
#include <stddef.h>
#include <unistd.h>

int write_full(int fd, const void *buf, size_t count)
{
    size_t done = 0;
    const char *p = buf;

    while (done < count) {
        ssize_t n = write(fd, p + done, count - done);

        if (n > 0) {
            done += (size_t)n;
        } else if (n == -1 && errno == EINTR) {
            continue;
        } else {
            return -1;
        }
    }

    return 0;
}
```

需要注意，`write_full()` 成功只表示数据已经被内核接受，不意味着对端应用程序已经收到或处理了这些数据。

在 Linux 中，向已经关闭读取端的 TCP 连接写入数据还可能触发 `SIGPIPE`。实际服务器需要根据程序设计处理这一情况，例如使用 `send()` 配合 `MSG_NOSIGNAL`，或合理配置 `SIGPIPE` 处理策略。

### 4.3 应用层协议必须定义消息边界

既然 TCP 不保留消息边界，应用程序就需要自行定义协议。常见方案包括：

**方案一：固定长度消息**

每条消息都具有相同的字节长度，接收方读取指定长度。

**方案二：长度前缀**

先发送消息长度，再发送对应数量的字节。例如：

```text
[4 字节长度][消息内容]
```

接收方先读取长度字段，再循环读取完整消息体。

**方案三：分隔符**

以换行符等特殊字符作为消息结束标志。适用于文本协议，但必须考虑转义和缓冲区限制。

这也是为什么真实网络服务不能简单地假定一次 `read()` 就能读到一条完整消息。

## 五、关闭 Socket 连接

通信结束后，通常使用：

```c
close(fd);
```

关闭文件描述符会释放当前进程持有的对应描述符引用。当相关引用都关闭后，内核才能完成相应 Socket 资源的回收。

TCP 连接的关闭还涉及协议层面的状态变化。如果需要分别关闭发送或接收方向，可以使用 `shutdown()`：

```c
shutdown(fd, SHUT_WR);
```

这表示不再向对端发送数据，但仍可以继续接收数据。

需要区分：

- `close()`：关闭一个文件描述符。
- `shutdown()`：控制 Socket 的通信方向。

在使用 `fork()` 或多线程处理连接时，文件描述符可能被多个执行上下文共享或复制，因此必须明确由谁负责关闭，避免资源泄漏或提前关闭。

## 六、为什么网络字节序很重要？

不同计算机架构可能采用不同的整数字节排列方式。

例如，整数 `0x12345678` 在大端序内存中的字节排列是：

```text
12 34 56 78
```

在小端序内存中的排列则是：

```text
78 56 34 12
```

如果直接把整数在内存中的字节发给另一台机器，不同字节序的机器就可能得到不同的数值。

Internet 协议约定使用网络字节序，即大端序。常用的转换函数有：

| 函数 | 含义 |
|---|---|
| `htons()` | 主机字节序转网络字节序，16 位 |
| `ntohs()` | 网络字节序转主机字节序，16 位 |
| `htonl()` | 主机字节序转网络字节序，32 位 |
| `ntohl()` | 网络字节序转主机字节序，32 位 |

例如：

```c
uint16_t port = htons(8080);
uint32_t value = htonl(123456);
```

不过，这些函数不会自动建立通用的网络消息格式。对于复杂协议，还需要明确字段长度、符号、对齐和序列化规则，不能直接把任意 C 结构体的内存布局发送到网络上。

## 七、从 Socket API 到真正的网络服务

掌握 `socket()`、`bind()`、`listen()`、`accept()`、`connect()`、`read()`、`write()` 和 `close()`，只是网络编程的起点。

一个实际的网络服务器还需要考虑：

- **并发模型：** 多进程、多线程、线程池或 I/O 多路复用。
- **超时与取消：** 避免客户端不发送完整消息而长期占用资源。
- **错误处理：** 区分连接重置、正常关闭、临时错误和系统资源不足。
- **资源管理：** 限制连接数量、缓冲区大小和内存使用。
- **协议设计：** 明确消息边界、字段编码和版本兼容性。
- **安全性：** 验证输入、限制资源消耗，并根据需求使用 TLS。

对于 Linux 系统编程学习者，一个很好的练习是先实现单连接 TCP Echo Server，再逐步支持多个客户端、长度前缀协议和非阻塞 I/O。

## 八、总结

BSD Socket 提供了网络应用程序与操作系统之间的标准化通信接口。理解它，意味着你开始接触应用层程序与传输层协议之间的边界。

最重要的知识点有四个：

1. TCP 服务端通过 `socket()`、`bind()`、`listen()` 和 `accept()` 建立服务。
2. TCP 客户端通过 `socket()` 和 `connect()` 建立连接。
3. TCP 是字节流，应用程序必须自行处理部分读写和消息边界。
4. 网络协议需要明确字节序、数据格式、错误处理和连接生命周期。

当这些基础概念真正掌握之后，再学习 `poll()`、`epoll`、非阻塞 Socket、事件循环和高性能网络服务器，就会有清晰的知识基础。

## 参考资料

- Jim Frost, [BSD Sockets: A Quick And Dirty Primer](https://cis.temple.edu/~ingargio/old/cis307s96/readings/docs/sockets.html)
- Linux 手册：`man 2 socket`、`man 2 bind`、`man 2 listen`、`man 2 accept`、`man 2 connect`、`man 2 read`、`man 2 write`
- [The Linux Programming Interface](https://man7.org/tlpi/)
- [Beej's Guide to Network Programming](https://beej.us/guide/bgnet/)
