---
title: "Computer Networks P&D 阅读笔记 Ch1"
date: '2026-10-30T11:59:50+08:00'
draft: false
tags: [TCP/IP, Computer Networks A Systems Approach]
categories: [计算机网络]
---
这是一本关于计算机网络的[开源书籍](https://book.systemsapproach.org/index.html)，写得非常好。

# Preface

> “系统方法” 指的是计算机系统设计和实现领域的一个概念。计算机科学研究人员和从业者通常使用这个术语来研究构建复杂计算系统（例如操作系统、网络、分布式应用程序等）时出现的问题。
> 

**系统方法的关键在于“全局观”**：你需要关注系统的各个组件如何相互作用以实现整体结果，而不是仅仅优化每个组件。

在网络领域，这通常意味着要**超越传统的分层视角**，思考如何以可能涉及多个层面的方式来最佳地解决问题。拥塞控制就是一个很好的例子，它涉及多个层面，并影响终端系统和网络设备。我们将拥塞这一系统级问题单独成章进行讨论，而不是试图将其硬塞进传输层等其他层级。

# 1. 问题：如何构建计算机网络？

> 假设让你来构建一个计算机网络，你会如何设计它？
> 

如果我们要构造一个未来可能扩展到全球规模，并支持远程会议、视频点播、电子商务、分布式计算和数字图书馆等各种应用的网络。

- 有哪些**现有技术**可以作为底层构建模块？
- 你会设计什么样的**软件架构**来将这些构建模块集成到一个高效的通信服务中？

本书的主要目标就是回答这个问题：介绍现有的网络技术，并展示如何利用它们从零开始构建网络。

> 计算机网络与其他类型的网络有何区别？
> 

计算机网络最重要的特性或许在于其通用性。其主要由通用可编程硬件（CPU）构建，并非针对特定应用。它们能够承载多种不同类型的数据，并支持广泛且不断增长的应用。

# 2. 应用

计算机网络的应用包括：例如万维网、电子邮件、社交媒体、流媒体音乐或电影、视频会议、即时通讯、文件共享等等。

使用计算机网络的群体：

- 网络应用开发者
- 网络运维管理者
- 网络协议的设计和构建者

# 3. 要求

> 我们为自己设定了一个雄心勃勃的目标：从零开始构建计算机网络。
> 

为了实现这一目标，我们将从基本原理入手，然后提出在构建实际网络时自然会遇到的问题。

计算机网络的要求如下：

- 可扩展链接
- 高效的资源共享
- 支持通用服务
- 可管理性好

---

**网络共享的基本概念：多路复用。**

- 时分多路复用，将时间分割成大小相等的量子，并以轮询的方式让每个数据流有机会通过物理链路发送数据。
- 频分多路复用，使用不同的频率通过物理链路传输每个数据流
    - 如果其中一个流（主机对）没有数据要发送，那么它所占用的物理链路份额——即时间片或频率——就会处于空闲状态，即使其他流有数据要发送
- 统计复用，按需从每个数据流发送的，而不是在预定的时隙内发送。
    - 为了保证每个数据流都能获得使用链路发送数据的机会，统计复用为每个数据流在给定时间允许传输的数据块大小设定了一个上限。这个大小受限的数据块通常被称为**数据*包***，以区别于应用程序可能想要传输的任意大小的*消息*。
    - **核心思想：按Packet发送数据，而不是任意长度**
    - 源端可能需要将消息分割成多个数据包，接收端再将这些数据包重新组装成原始消息。

# 4. 计算机网络的架构

> 抽象——即将实现细节隐藏在定义良好的接口之后——是系统设计者用来管理复杂性的基本工具。
> 

为了应对设计计算机网络系统的复杂性，网络设计者提出了网络架构的概念来指导网络的设计与实现。主要的计算机网络架构包括：

- OSI七层模型
- TCP/IP四层模型

抽象自然而然地导致了分层，尤其是在网络系统中。其基本思路是，从底层硬件提供的服务入手，然后添加一系列层，每一层都提供更高（更抽象）的服务级别。高层提供的服务是根据底层提供的服务来实现的。

![image.png](/images/posts/net-sys1/image.png)

分层提供了两个实用功能：

1. 将构建网络的问题分解成更易于管理的组件。与其实现一个包罗万象的单体软件，不如实现多个层，每个层解决问题的一部分。
2. 提供了一种更模块化的设计。如果您决定添加一些新服务，可能只需要修改其中一层的功能，即可重用其他层提供的函数。

很多时候，系统的任何同一层级中提供了多种抽象，每种抽象都为更高层级提供不同的服务，但都基于相同的底层抽象，例如传输层的TCP和UDP协议，都以IP协议的服务为基础，但对上层提供不同的传输服务。

![image.png](/images/posts/net-sys1/image%201.png)

构成网络系统各层的抽象对象称为**协议**。协议提供了一种通信服务，供更高层的对象（例如应用程序进程，或者更高层级的协议）交换消息。

每个协议都定义了两个不同的接口：

- 服务接口（纵向）*，*供同一台计算机上其他想要使用其通信服务的对象使用。
- 协议定义了与另一台机器上的对应节点（对等节点）之间的接口（横向）。

![image.png](/images/posts/net-sys1/image%202.png)

协议规定了如何在同层的对等节点之间传输数据，如何体现？本质就是在发送数据之前在其前面加上一个首部（Header），对等节点在收到数据后根据协议解析该首部，然后取出其中的数据发往上层。

> 当我们说底层协议不解释它从高层协议接收到的消息时，指的是它不知道如何从消息中包含的数据中提取任何含义。
> 

当然，有时底层协议会对接收到的数据进行一些简单的转换，例如压缩或加密。

![image.png](/images/posts/net-sys1/image%203.png)

**多路复用与解多路复用**

- 因为计算机网络是多层的，且每层可能包含不止一种协议，因此在底层的首部中还要包含一个字段，用来表示该数据所属的上层协议。
- 几乎所有协议都实现了这种机制。

下面是OSI七层模型和TCP四层模型的架构图：

![image.png](/images/posts/net-sys1/image%204.png)

![image.png](/images/posts/net-sys1/image%205.png)

虽然现在TCP四层模型成为了实际上的标准，但是OSI七层模型仍有其价值，因为会话层和表示层在开发应用软件时仍需要考虑到。

- 会话层提供了一个命名空间，用于将构成单个应用程序的不同传输流连接起来。例如，它可以管理在远程会议应用程序中组合的音频流和视频流。
- 表示层，它负责处理对等方之间交换的数据格式。

# 5. 软件

了解如何实现网络软件是理解计算机网络的重要组成部分。虽然你不太可能被委派去实现像 IP 这样的底层协议，但你很有可能会遇到需要实现应用层协议的情况——这种梦寐以求的“杀手级应用”能为你带来难以想象的名利双收。

Socket API

- int socket(int domain, int type, int protocol);
    - domain：PF_INET表示互联网，PF_UNIX表示Unix管道机制，PF_PACKET表示直接访问网络接口（即绕过 TCP/IP 协议栈）
    - type：表示通讯语义，SOCK_STREAM表示字节流服务，SOCK_DGRAM表示数据报服务
    - protocol：标识要使用的协议，
- int bind(int socket, struct sockaddr* address, int addr_len);
    - 将socket与自己的IP地址+端口绑定
- int listen(int socket, int backlog);
    - 开始监听端口，其他主机向自己发送数据
- int accept(int socket, struct sockaddr* address, int* addr_len);
    - 一个阻塞命令
    - 从已完成建立的连接中取出一个开始通讯
- int connect(int socket, struct sockaddr *address, int addr_len);
    - 客户端主动与IP地址 + 端口建立连接
- int send(int socket, char *message, int msg_len, int flags);
    - 发送数据
- int recv(int socket, char *buffer, int buf_len, int flags);
    - 接收数据

客户端示例程序：

- 使用gethostbyname()根据域名获取目标服务器主机的信息
- 将地址信息填入sockaddr_in结构体
- 通过socket()创建一个socket实体，采用TCP协议
- 通过connect()尝试与目标主机建立连接
- 在循环中不断从标准输入读取数据，通过send()发送给目标主机

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netdb.h>

#define SERVER_PORT  "5432"   /* getaddrinfo 用字符串端口 */
#define MAX_LINE     256

int main(int argc, char *argv[])
{
    struct addrinfo  hints, *res, *rp;
    char             buf[MAX_LINE];
    int              s = -1, rc;
    size_t           len;

    if (argc != 2) {
        fprintf(stderr, "usage: simplex-talk host\n");
        exit(1);
    }

    memset(&hints, 0, sizeof(hints));
    hints.ai_family   = AF_UNSPEC;      /* 允许 IPv4 或 IPv6 */
    hints.ai_socktype = SOCK_STREAM;

    if ((rc = getaddrinfo(argv[1], SERVER_PORT, &hints, &res)) != 0) {
        fprintf(stderr, "simplex-talk: %s\n", gai_strerror(rc));
        exit(1);
    }

    /* 尝试每个可用地址，直到 connect 成功 */
    for (rp = res; rp != NULL; rp = rp->ai_next) {
        s = socket(rp->ai_family, rp->ai_socktype, rp->ai_protocol);
        if (s < 0)
            continue;
        if (connect(s, rp->ai_addr, rp->ai_addrlen) == 0)
            break;                      /* 成功 */
        close(s);
        s = -1;
    }
    freeaddrinfo(res);

    if (s < 0) {
        perror("simplex-talk: connect");
        exit(1);
    }

    while (fgets(buf, sizeof(buf), stdin) != NULL) {
        len = strlen(buf);
        if (send(s, buf, len, 0) < 0) {
            perror("simplex-talk: send");
            break;
        }
    }

    close(s);
    return 0;
}
```

服务端示例程序：

- 将本机的IP地址 + 端口填入sockaddr_in结构体
- 通过socket()创建socket
- 通过bind()绑定socket与地址信息
- 通过listen()开始监听连接
- 通过accept()获取已建立完成的连接
- 最后通过recv()读取收到的数据，并输出到标准输出
    - 因为TCP传输数据时是无边界的，一次recv可能只会读去部分数据，因此要使用while不断读取，直至确保没有数据为止（recv返回值为0）。

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>

#define SERVER_PORT  5432
#define MAX_PENDING  5
#define MAX_LINE     256

int main(void)
{
    struct sockaddr_in sin;
    char               buf[MAX_LINE];
    ssize_t            buf_len;
    socklen_t          addr_len;
    int                s, new_s, opt = 1;

    /* 构建地址结构 */
    memset(&sin, 0, sizeof(sin));
    sin.sin_family      = AF_INET;
    sin.sin_addr.s_addr = INADDR_ANY;
    sin.sin_port        = htons(SERVER_PORT);

    /* 被动打开 */
    if ((s = socket(AF_INET, SOCK_STREAM, 0)) < 0) {
        perror("simplex-talk: socket");
        exit(1);
    }

    /* 允许地址复用，避免重启时 bind 失败 */
    if (setsockopt(s, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
        perror("simplex-talk: setsockopt");
        exit(1);
    }

    if (bind(s, (struct sockaddr *)&sin, sizeof(sin)) < 0) {
        perror("simplex-talk: bind");
        exit(1);
    }
    if (listen(s, MAX_PENDING) < 0) {
        perror("simplex-talk: listen");
        exit(1);
    }

    /* 等待连接，接收并打印文本 */
    while (1) {
        addr_len = sizeof(sin);
        if ((new_s = accept(s, (struct sockaddr *)&sin, &addr_len)) < 0) {
            if (errno == EINTR)
                continue;
            perror("simplex-talk: accept");
            exit(1);
        }

        while ((buf_len = recv(new_s, buf, sizeof(buf), 0)) > 0)
            fwrite(buf, 1, (size_t)buf_len, stdout);   /* 按长度写出，安全 */

        if (buf_len < 0 && errno != EINTR)
            perror("simplex-talk: recv");

        close(new_s);
    }

    close(s);   /* 不可达，仅为完整性 */
    return 0;
}
```

# 6. 性能

与任何计算机系统一样，计算机网络也需要具备良好的性能。

网络性能主要通过两种基本方式来衡量：

- 带宽 （也称吞吐量），指链路每秒可以传输的比特数。
    - 传输的bits数 / 传输时间
- 延迟（也称时延），指消息从网络的一端传输到另一端所需的时间。
    - 传播延迟（Propagation）
    - 传输延迟（Transmit）
    - 排队延迟（Queue）

其他的性能评价指标：

- 时延带宽积 = 带宽 * 时延，表示当前链路中有多少bits正在被传输