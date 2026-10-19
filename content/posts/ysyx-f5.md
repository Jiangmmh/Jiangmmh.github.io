---
title: "一生一芯-F5阶段笔记"
date: '2026-10-19T15:15:35+08:00'
draft: false
tags: [处理器, RISC-V,]
categories: [一生一芯]
---

这篇文章的内容如下：

- 解释在ISA层面，指令的执行过程，包括取指、译码、执行和更新PC四步。
- 然后介绍了一个只有3条指令的指令集架构 sISA。
- 使用Logisim实现sISA处理器，并用其执行数列求和程序。

# 课程笔记

前面我们学习了数字电路的基础知识（晶体管、组合逻辑电路和时序逻辑电路）、处理器的基本原理和状态机模型。这节课介绍了一个简单处理器的实现。

## 1. 只有一条指令的CPU

暂时让sISA仅支持一条指令 **li** ，该指令的作用是将立即数加载到目标寄存器中。

![image.png](/images/posts/ysyx-f5/image.png)

下面介绍处理器是如何执行指令的：

![image.png](/images/posts/ysyx-f5/image%201.png)

在处理器中存在一个寄存器PC，用于存储下一条待执行指令的地址。

例如，该地址可以用于索引存储在ROM中的指令：

![image.png](/images/posts/ysyx-f5/image%202.png)

在取得指令后，便需要对指令进行解析，这个过程被称为译码，译码包括：

- 理解指令所表示的操作，产生执行该操作必须的控制信号
- 识别指令中的操作数，输出相应字段

![image.png](/images/posts/ysyx-f5/image%203.png)

![image.png](/images/posts/ysyx-f5/image%204.png)

通过对指令译码我们知道了**该指令要做什么？处理的数据是什么？**然后便是驱动具体的功能电路执行指令：

![image.png](/images/posts/ysyx-f5/image%205.png)

指令的执行可能会访问内存（RAM）：

![image.png](/images/posts/ysyx-f5/image%206.png)

## 2. 实现更多指令

因为sISA一共包含3条指令，因此使用2bits的opcode来标识指令的类型。

**add** 指令用于对两个源寄存器求和并将结果存入目的寄存器，其需要同时读取两个寄存器的值，因此寄存器文件应当支持两个读端口。

![image.png](/images/posts/ysyx-f5/image%207.png)

![image.png](/images/posts/ysyx-f5/image%208.png)

继续添加**bner0**指令（**branch not equal register 0**）：

![image.png](/images/posts/ysyx-f5/image%209.png)

![image.png](/images/posts/ysyx-f5/image%2010.png)

综上所述，我们可以得出为ISA添加指令的基本思路：

![image.png](/images/posts/ysyx-f5/image%2011.png)

# 讲义笔记

关于sISA的细节：

- 支持如下三条指令：**add**, **li**, **bner0**
- 支持包含**4个**寄存器的寄存文件，因此寄存器索引的长度为**2位**
- 支持**4位**的立即数，数值范围[0, 15]
- 一条指令长度为**8位**：**2位**用于opcode

![image.png](/images/posts/ysyx-f5/image%2012.png)

![image.png](/images/posts/ysyx-f5/image%2013.png)

```nasm
10001010    # 0: li r0, 10
10010000    # 1: li r1, 0
10100000    # 2: li r2, 0
10110001    # 3: li r3, 1
00010111    # 4: add r1, r1, r3
00101001    # 5: add r2, r2, r1
11010001    # 6: bner0 r1, 4
11011111    # 7: bner0 r3, 7
```
## 1. 实现ROM

先来确定一下ROM的规格：GPR寄存器长度为**8位**，因此我们将PC寄存器的长度也设置为**8位**，因此ROM总共能存储**2^8 = 256**条长度为8位的指令。

但是这里为了实现方便，暂时仅实现支持存放8条指令的ROM，指令的内容实用常量来表示。

![image.png](/images/posts/ysyx-f5/image%2014.png)

![image.png](/images/posts/ysyx-f5/image%2015.png)

## 2. 实现GPR
sISA支持4个8位GPR，因此该RAM的规格为 **4 * 8 bits**，为了支持add这类寄存器指令，需要能同时读两个寄存器，写一个寄存器。

![image.png](/images/posts/ysyx-f5/image%2016.png)

![image.png](/images/posts/ysyx-f5/image%2017.png)

![image.png](/images/posts/ysyx-f5/image%2018.png)

![image.png](/images/posts/ysyx-f5/image%2019.png)

## 3. 实现控制器和立即数生成器
现在我们已经准备好了存储指令的ROM和支持4个寄存器的寄存器文件，还需要实现：

- **控制器**：用于对指令Inst进行译码，输出控制信号
- **立即数生成器**：用于从指令Inst中解析出立即数

![image.png](/images/posts/ysyx-f5/image%2020.png)

sISA所支持的三条指令中，可能产生的立即数有两个：

![image.png](/images/posts/ysyx-f5/image%2021.png)

## 4. 连接组件构造sCPU
将这些组件按处理器运行的逻辑连接起来，得到的电路图如下所示。注意其中使用了Logisim中的Channel（隧道）组件，用于简化连线，注意查看各Channel上的标签，理清信号传输的方向。

![image.png](/images/posts/ysyx-f5/image%2022.png)

让该处理器执行数列求和指令，结果如下图所示：

```nasm
10001010    # 0: li r0, 10
10010000    # 1: li r1, 0
10100000    # 2: li r2, 0
10110001    # 3: li r3, 1
00010111    # 4: add r1, r1, r3
00101001    # 5: add r2, r2, r1
11010001    # 6: bner0 r1, 4
11011111    # 7: bner0 r3, 7
```

![image.png](/images/posts/ysyx-f5/image%2023.png)

此时的状态是跳出循环的最后一条 **add r2, r2, r1** 指令执行完毕时的状态，**r1**的值为**45**，**r2**的值为**10**，求和的结果为**55**（正是**1+…+10**的结果），结果会被写入到**r2**中。

## 5. 执行另一个测试程序
![image.png](/images/posts/ysyx-f5/image%2024.png)

使用sISA提供的指令编写程序：

```nasm
10001011    # 0: li r0, 11
10010001    # 1: li r1, 1
10100000    # 2: li r2, 0
10110010    # 3: li r3, 2
00101001    # 4: add r2, r2, r1
00010111    # 5: add r1, r1, r3
11010001    # 6: bner0 r1, 4
11011111    # 7: bner0 r3, 7
```

将其写入到我们先前实现的ROM中：

![image.png](/images/posts/ysyx-f5/image%2025.png)

然后用我们设计的 **sISA机器** 来运行该程序，可以看到在最后一次循环时，将ALU的结果 **25** 写入寄存器 **r2** 中，这正是 1, 3, 5, 7, 9的和。

![image.png](/images/posts/ysyx-f5/image%2026.png)