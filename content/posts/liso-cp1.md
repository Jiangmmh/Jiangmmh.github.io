---
title: "15441-Liso-CP1"
date: '2026-10-30T16:20:00+08:00'
draft: false
tags: [Web Server, Liso, 15441]
categories: [计算机网络]
---
# 项目介绍

该是卡耐基梅隆大学（CMU）的计算机网络课程（[**15441: Networking and the Internet**](https://web2.qatar.cmu.edu/~kharras/courses/15441/#/)）的第一个项目。

> **The purpose of this project is to give you experience in developing concurrent network applications.**
> 

在这个项目中我们将使用Berkeley Socket API编写Web服务器，支持：

- 部分HTTP1.1 协议，细节见文档 [RFC2616](https://www.rfc-editor.org/info/rfc2616/)
- HTTPS（via TLS）协议，细节见文档 [RFC2818](https://www.rfc-editor.org/info/rfc2818/)
- CGI（Common Gateway Interface），细节见文档 [RFC 3875](https://www.rfc-editor.org/info/rfc3875/)

> 
> 
> 
> your **Liso web server** will be fully functional and capable of **running interactive web applications via its CGI interface**. At the end of the project the final test will be running a simple web blog written using the Python Flask microframework。
> 

最后这个Web Server将具有完备的功能，能够通过CGI接口运行交互式Web应用。

整个项目将分为三个阶段：

- Checkpoint1：创建一个基于select()的回声服务器，支持同时处理多个客户端请求
- Checkpoint2：实现HTTP1.1 Parser，支持持久连接的HEAD、GET和POST方法
- Final Submission：实现HTTPS via TLS、实现服务端CGI

对于除HEAD、GET和POST以外的方法，统一返回 ”501 Method Unimplemented“。

# 课程笔记

什么是Web服务器？

![image.png](/images/posts/liso-cp1/image.png)

该项目就要求我们使用BSD Socket API实现一个Web服务器：

![image.png](/images/posts/liso-cp1/image%201.png)

关于Socket API：

![image.png](/images/posts/liso-cp1/image%202.png)

![image.png](/images/posts/liso-cp1/image%203.png)

在网络编程中还要注意字节序、资源管理和应对可能出现的错误：

![image.png](/images/posts/liso-cp1/image%204.png)

一个服务器应当为多个用户提供支持，实现思路有：多线程 和 I/O多路复用

![image.png](/images/posts/liso-cp1/image%205.png)

在该项目的描述中要求使用select（I/O多路复用）实现同时为多个客户端提供服务的支持。当然，为了提高性能，后续我们可以将其重构为使用 epoll 来实现。

![image.png](/images/posts/liso-cp1/image%206.png)

![image.png](/images/posts/liso-cp1/image%207.png)

下面这些注意事项在实现Liso服务器时会遇到，到时候回来看看：

![image.png](/images/posts/liso-cp1/image%208.png)



# CP1: Echo with select
> 在该Checkpoint中，我们需要基于 select() 实现一个同时支持多个客户端的回声服务器。

关于Socket编程可以看如下材料：
- 关于BSD Socket，可以看我的[这篇博客](https://jiangmmh.github.io/posts/unix-socket/)。
- 更多Socket编程信息，可以看[Beej的教程](https://app.notion.com/p/A-Web-Server-Called-Liso-3e9c4e9326148013a493e613f87fb624?pvs=21)。
- 其他材料包括：《Unix环境高级编程》、《Unix网络编程》、《Linux高性能服务器编程》、《Linux多线程服务端编程》


## 1. 构造地址信息结

首先我们需要构造好地址信息，按 getaddrinfo() 的使用方法构造一个 addrinfo 结构体：

- ai_family 表示协议族，设置为AF_UNSPEC
    - AF_UNSPEC 告诉 getaddrinfo：**“IPv4 和 IPv6 地址我都能接受，你返回所有可用的结果，我自己来挑。”** 它把协议族的选择权从“编译期写死”变成了“运行期动态决定”。
    - 用于**双栈（dual-stack）主机**中，即主机同时拥有IPv4和IPv6。
- ai_socktype 表示Socket类型，这里设置为SOCK_STREAM，表示采用字节流服务
    - 该服务类型默认使用TCP协议
- ai_flags 被设置为AI_PASSIVE，作用是告诉 getaddrinfo “我要用返回的地址来 bind() 一个监听套接字（服务端），而不是去 connect() 别人（客户端）”。

然后调用 getaddrinfo() ，其返回一个**单向链表**（struct addrinfo *res），链表里每个节点都包含一组参数——即地址族、套接字类型、协议号，以及一个已填充好的 `sockaddr` 结构。

```c
#include <netdb.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/ip.h>

#define ECHO_PORT "9999"

int main(int argc, char* argv[])
{
    int status;
    struct addrinfo hints, *res;
    
    // 使用 struct addrinfo 构造地址信息
    memset(&hints, 0, sizeof hints);    // 确保 struct 为空
    hints.ai_family = AF_UNSPEC;        // 不用管是 IPv4 或 IPv6
    hints.ai_socktype = SOCK_STREAM;    // TCP stream sockets
    hints.ai_flags = AI_PASSIVE;        // 自动填入本机IP
    
    if ((status = getaddrinfo(NULL, ECHO_PORT, &hints, &res)) != 0) {
        fprintf(stderr, "getaddrinfo: %s\n", gai_strerror(status));
        return EXIT_FAILURE;
    } 
    
    ...
}
```

这是 addrinfo 结构体的具体字段：

```c
struct addrinfo {
    int             ai_flags;       // 输入标志（AI_PASSIVE 等），返回时一般不用
    int              ai_family;     // AF_INET / AF_INET6  
    int              ai_socktype;   // SOCK_STREAM / SOCK_DGRAM 
    int              ai_protocol;   // IPPROTO_TCP / IPPROTO_UDP
    socklen_t        ai_addrlen;    // ai_addr 的字节长度 
    struct sockaddr *ai_addr;       // 已填好的地址结构 
    char            *ai_canonname;  // 规范主机名（仅首个节点，需 AI_CANONNAME）
    struct addrinfo *ai_next;       // 链表下一个节点
};
```

## 2. 创建socket并绑定地址

创建socket，在getaddrinfo()返回的链表中搜索可用的socket信息，再以此创建socket。

此外还要注意：

- 在TPC协议中，任何主动关闭连接的一方为了保证通信的正确性，都会进入**TIME_WAIT状态**。我们可以使用 setsockopt() + SO_REUSEADDR 来设置服务端的socket，使得服务端重启时，即使旧连接处于 `TIME_WAIT` 状态，也能立即绑定同一端口，不会报 `Address already in use`。
- 在用完后，记得使用freeaddrinfo()释放getaddrinfo()得到的链表。

关于TIME_WAITE都更多细节，见这篇博客（还没写，后续补上）。

```c
		if ((status = getaddrinfo(NULL, ECHO_PORT, &hints, &res)) != 0) {
        fprintf(stderr, "getaddrinfo: %s\n", gai_strerror(status));
        return EXIT_FAILURE;
    } 

    /* 创建Socket：遍历所有候选地址，尝试 socket + SO_REUSEADDR + bind */
    for (rp = res; rp != NULL; rp = rp->ai_next) {
        sock = socket(rp->ai_family, rp->ai_socktype, rp->ai_protocol);
        if (sock < 0)
            continue;

        int opt = 1;
        setsockopt(sock, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

        if (bind(sock, rp->ai_addr, rp->ai_addrlen) == 0)
            break;                      /* 绑定成功 */

        close(sock);
        sock = -1;
    }
    freeaddrinfo(res);                  /* 释放链表 */
```

## 3. 开始监听！

调用 listen() 监听IP地址 + 端口，允许客户端与本机建立连接。

```c
		// 监听IP地址+端口
    if (listen(sock, 5) < 0)
    {
        close_socket(sock);
        fprintf(stderr, "Error listening on socket.\n");
        return EXIT_FAILURE;
    }
```

## 4. 使用select

为了使Liso服务器能同时服务于多个客户端，我们选择使用I/O多路复用技术 select 来实现。

关于 select 的介绍可以看 [man文档](https://man7.org/linux/man-pages/man2/select.2.html) 和 [Beej’s guide](https://beej-zhcn.netdpi.net/advanced_tech/selectff1a_tong_bu_i__o_duo_gong)。

首先我们创建一个fd_set结构体master，然后初始化它。此外还需要准备一个变量max_fds记录当前最大文件描述符的值，调用 select() 时需要其作为参数。

```c
#include <sys/select.h>

		fd_set master;
    FD_ZERO(&master);
    FD_SET(sock, &master); // 将服务端socket加入fdset，用于监听客户端连接
    int max_fds = sock;
    char buf[BUF_SIZE];
```

下面是使用 select 处理客户端连接请求和数据的框架：

- 由于在 select() 的调用中会修改传入的fd_set和timeval，所以每次调用前准备一份独立的数据。
- 调用 select()，其退出后我们需要遍历当前的全部fds，找到就绪的fd，对其进行处理。

```c
		while (1) {     
				// 调用select()并处理返回的结果
        fd_set readfds = master;
        struct timeval tv = {2, 500000};
        int nready = select(max_fds + 1, &readfds, NULL, NULL, &tv);
        if (nready == 0) continue;
        if (nready == -1) {
            if (errno == EINTR) continue;
            perror("select");
            break;
        }
	      
	      // 遍历fds，处理状态发生改变的fd
        for (int i = 0; i <= max_fds; i++) {
            if (!FD_ISSET(i, &readfds)) 
                continue;
                
            if (i == sock) {
                // 有客户端连接
                handle_new_connection(sock, &master, &max_fds);
            } else {
                // 来自客户端的数据
                if (handle_client_data(i, buf) == -1) {
                    remove_client(i, &master, &max_fds);
                }
            }
        }
    }
```

## 5. 实现对socket的处理

处理客户端的连接请求，注意 `accept()` 的两个可恢复错误：

- `EINTR`（被信号打断）。
    - `EINTR` = "**Interrupted system call**"（系统调用被信号中断）。
    - 它表示：某个**阻塞的系统调用**（如 `recv`、`send`、`select`、`accept`、`read`）在等待期间，进程收到了一个**信号**，内核提前让该系统调用返回 `-1` 并置 `errno = EINTR`，**而不是让调用失败**，正确做法是**重试**该调用。
- `ECONNABORTED`（连接在完成三次握手前被客户端/网络中止）。
- 两者都不应该让服务器退出，处理方式是继续 `accept`（`continue`）。

```c
/*
 * Accept a new client connection.
 */
void handle_new_connection(int sock, fd_set *master, int *max_fds)
{
    struct sockaddr_storage cli_addr;
    socklen_t cli_size = sizeof(cli_addr);

    int client_sock = accept(sock, (struct sockaddr *)&cli_addr, &cli_size);

    if (client_sock == -1) {
        if (errno == EINTR || errno == ECONNABORTED)
            return;

        perror("accept");
        return;
    }

    if (client_sock >= FD_SETSIZE) {
        fprintf(stderr, "Client socket exceeds FD_SETSIZE.\n");
        close_socket(client_sock);
        return;
    }

    FD_SET(client_sock, master);

    if (client_sock > *max_fds)
        *max_fds = client_sock;
}
```

使用 handle_client_data() 处理客户端发送过来的数据，注意 EINTR 错误，在遇到系统调用返回值为 -1 时要检查 errno 的值是否为 EINTR，如果是就continue重试。

```c
/*
 * Receive data from a client and echo it back.
 *
 * Return 0 if successful, -1 if the connection should be closed.
 */
int handle_client_data(int client_sock, char *buf)
{
    ssize_t readret = recv(client_sock, buf, BUF_SIZE, 0);

    if (readret == 0)
        return -1;

    if (readret == -1) {
        if (errno == EINTR)
            return 0;

        perror("recv");
        return -1;
    }

    ssize_t sent = 0;

    while (sent < readret) {
        ssize_t n = send(client_sock, buf + sent,
                         (size_t)(readret - sent), 0);

        if (n == -1) {
            if (errno == EINTR)
                continue;

            perror("send");
            return -1;
        }

        if (n == 0)
            return -1;

        sent += n;
    }

    return 0;
}
```

关闭客户端，记得更新 fdset 和 max_fds 。

```c
/*
 * Remove a client from the fd_set and close its socket.
 */
void remove_client(int client_sock, fd_set *master, int *max_fds)
{
    FD_CLR(client_sock, master);
    close_socket(client_sock);

    if (client_sock == *max_fds) {
        while (*max_fds >= 0 && !FD_ISSET(*max_fds, master))
            (*max_fds)--;
    }
}
```

## 6. 测试echo服务器

关于测试程序cp1_checker.py，原本是用python2编写，为了方便我用AI将其转换为pyhon3版本：

```python
#!/usr/bin/env python3

from socket import *
import sys
import random
import os
import time

if len(sys.argv) < 7:
    sys.stderr.write('Usage: %s <ip> <port> <#trials>\
            <#writes and reads per trial>\
            <max # bytes to write at a time> <#connections> \n' % (sys.argv[0]))
    sys.exit(1)

serverHost = gethostbyname(sys.argv[1])
serverPort = int(sys.argv[2])
numTrials = int(sys.argv[3])
numWritesReads = int(sys.argv[4])
numBytes = int(sys.argv[5])
numConnections = int(sys.argv[6])

socketList = []

RECV_TOTAL_TIMEOUT = 0.1
RECV_EACH_TIMEOUT = 0.01

for i in range(numConnections):
    s = socket(AF_INET, SOCK_STREAM)
    s.connect((serverHost, serverPort))
    socketList.append(s)

for i in range(numTrials):
    randomData = []
    randomLen = []
    # map(...) 在 Py3 是迭代器，必须 list() 才能索引与 shuffle
    socketSubset = list(map(lambda x: x % len(socketList), range(numWritesReads)))
    random.shuffle(socketSubset)
    socketSubset = list(map(lambda x: socketList[x], socketSubset))

    for j in range(numWritesReads):
        random_len = random.randrange(1, numBytes)
        random_string = os.urandom(random_len)
        randomLen.append(random_len)
        randomData.append(random_string)
        socketSubset[j].send(random_string)

    for j in range(numWritesReads):
        data = socketSubset[j].recv(randomLen[j])
        start_time = time.time()
        while True:
            if len(data) == randomLen[j]:
                break
            socketSubset[j].settimeout(RECV_EACH_TIMEOUT)
            data += socketSubset[j].recv(randomLen[j])
            if time.time() - start_time > RECV_TOTAL_TIMEOUT:
                break
        if data != randomData[j]:
            sys.stderr.write("Error: Data received is not the same as sent! \n")
            sys.exit(1)

for i in range(numConnections):
    socketList[i].close()

print("Success!")
```

该脚本会测试我们的 select echo 服务器。

- `<ip>` —— 服务端地址
    
    传给 `gethostbyname()` 解析成 IPv4。可写 `127.0.0.1`、`localhost` 或真实 IP。只支持 IPv4（`gethostbyname` 不支持 IPv6）。
    
- `<port>` —— 服务端端口
    
    必须是你的 `echo_server` 实际监听的端口（`ECHO_PORT`，默认 `9999`）。用 `int()` 转换。
    
- `<#trials>` —— 测试轮数
    
    外层循环跑多少轮。每轮重新随机选连接、随机生成数据、写入再读回校验。值越大跑得越久，覆盖的随机组合越多。
    
- `<#writes and reads per trial>` —— 每轮写/读次数
    
    每轮里对每条连接（按随机映射）执行多少次“发一段随机数据 → 读回并校验”。决定每轮的吞吐压力。
    
- `<max # bytes to write at a time>` —— 单次写入的最大字节数
    
    实际长度由 `random.randrange(1, numBytes)` 生成，是开区间，即每次随机 `1 ~ numBytes-1` 字节。必须 ≥ 2，否则 `randrange(1,1)` 抛 `ValueError`。它控制单个消息的大小上界，用于测试不同分片/缓冲行为。
    
- `<#connections>` —— 并发 TCP 连接数
    
    脚本启动时建立多少条连接到服务端。之后所有写/读都在这批连接上随机分配（`x % len(socketList)` 打散到各连接）。用于测试服务端多连接并发能力——你的 `select` 版 `echo_server` 正适合验证这一点。
    

下面编写一个shell脚本，在其中调用 cp1_checker.py 来对我们的实现进行测试：

```bash
#!/usr/bin/env bash
#
# run_tests.sh - 用 cp1_checker.py 对 echo_server 做多组代表性测试
#
# 用法:
#   ./run_tests.sh                     # 默认连 127.0.0.1:9999
#   ./run_tests.sh 192.168.1.10 9999   # 指定 ip 和 port
#
# 前置条件:
#   - ./echo_server 已在目标端口监听（脚本会检查）
#   - cp1_checker.py 与脚本在同一目录
#

set -u

HOST="${1:-127.0.0.1}"
PORT="${2:-9999}"
CHECKER="cp1_checker.py"

if [[ ! -f "$CHECKER" ]]; then
    echo "错误: 找不到 $CHECKER（请与脚本放在同一目录）" >&2
    exit 1
fi

# 测试组定义: "名称|trials|writes_reads|max_bytes|connections"
TESTS=(
    "baseline|10|100|64|4"
    "small-pkts-many-conns|20|50|2|32"
    "large-pkts|15|30|4096|8"
    "single-conn|10|200|1024|1"
    "long-run|50|200|512|16"
)

PASS=0
FAIL=0
FAILED_NAMES=()

echo "==================================================================="
echo " 目标: $HOST:$PORT"
echo " 共 ${#TESTS[@]} 组测试"
echo "==================================================================="

for t in "${TESTS[@]}"; do
    IFS='|' read -r name trials wr maxb conns <<< "$t"
    echo
    echo "-------------------------------------------------------------------"
    echo "[$((PASS+FAIL+1))/${#TESTS[@]}] $name"
    echo "  args: $HOST $PORT $trials $wr $maxb $conns"
    echo "-------------------------------------------------------------------"

    start=$(date +%s)
    if python3 "$CHECKER" "$HOST" "$PORT" "$trials" "$wr" "$maxb" "$conns"; then
        end=$(date +%s)
        echo "  => PASS  (${end}s - ${start}s = $((end-start))s)"
        PASS=$((PASS+1))
    else
        rc=$?
        end=$(date +%s)
        echo "  => FAIL  (exit=$rc, $((end-start))s)"
        FAIL=$((FAIL+1))
        FAILED_NAMES+=("$name")
    fi
done

echo
echo "==================================================================="
echo " 汇总: PASS=$PASS  FAIL=$FAIL  TOTAL=${#TESTS[@]}"
if [[ $FAIL -gt 0 ]]; then
    echo " 失败组:"
    for n in "${FAILED_NAMES[@]}"; do
        echo "   - $n"
    done
    echo "==================================================================="
    exit 1
fi
echo " 全部通过"
echo "==================================================================="
exit 0
```

该脚本中包含五组测试：

- **baseline：验证最基本的功能**
    - 跑10 轮，每轮 100 次写/读，每次 1~63 字节，4 条并发连接。
- **small-pkts-many-conns：验证多连接并发的情况**
    - 20 轮，每轮 50 次，每次 仅 1 字节，32 条连接。
    - 32 条连接同时活跃，每条只发 1 字节，数据量极小，压力全在 "服务端能否同时正确服务 32 个fd" 上。
- **large-pkts：对 大包 与 TCP 分段的情况进行测试**
    - 15 轮，每轮 30 次，每次 1~4095 字节，8 条连接。
    - 4095 字节远超单个 MSS（通常 1448），一次 `send` 会被 TCP 拆成 2~3 段到达服务端；服务端 `recv` 一次也未必收全，回显也可能分多段到达客户端。
    - 同时考验"分段到达"和"客户端超时策略"两个脆弱点。
- **single-conn：测试单连接的吞吐与状态机的稳定性**
    - 10 轮，每轮 200 次，每次 1~1023 字节，只有 1 条连接。
    - 排除并发干扰（只有 1 个 fd），专注看单条连接上连续 200 次收发是否都正确。
- **long-run：综合长跑稳定性**
    - 50 轮，每轮 200 次，每次 1~511 字节，16 条连接。

运行一下测试：

```bash
root@88db14327ace:~/cmu15441/p1-liso$ bash test_cp1.sh
===================================================================
 目标: 127.0.0.1:9999
 共 5 组测试
===================================================================

-------------------------------------------------------------------
[1/5] baseline
  args: 127.0.0.1 9999 10 100 64 4
-------------------------------------------------------------------
Success!
  => PASS  (1793347362s - 1793347362s = 0s)

-------------------------------------------------------------------
[2/5] small-pkts-many-conns
  args: 127.0.0.1 9999 20 50 2 32
-------------------------------------------------------------------
Success!
  => PASS  (1793347362s - 1793347362s = 0s)

-------------------------------------------------------------------
[3/5] large-pkts
  args: 127.0.0.1 9999 15 30 4096 8
-------------------------------------------------------------------
Success!
  => PASS  (1793347362s - 1793347362s = 0s)

-------------------------------------------------------------------
[4/5] single-conn
  args: 127.0.0.1 9999 10 200 1024 1
-------------------------------------------------------------------
Success!
  => PASS  (1793347362s - 1793347362s = 0s)

-------------------------------------------------------------------
[5/5] long-run
  args: 127.0.0.1 9999 50 200 512 16
-------------------------------------------------------------------
Success!
  => PASS  (1793347363s - 1793347362s = 1s)

===================================================================
 汇总: PASS=5  FAIL=0  TOTAL=5
 全部通过
===================================================================
```