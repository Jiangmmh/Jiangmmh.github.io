---
title: "一生一芯-F6阶段笔记"
date: '2026-10-19T16:00:30+08:00'
draft: false
tags: [处理器, RISC-V,]
categories: [一生一芯]
---

这篇文章的内容：

- 改进前面所设计的sISA，新增一条io指令，用于与外部设备进行IO。
- 对 li 和 bne0这两条指令进行增强，并使用LED条和16进制数码管检查新sISA的实现。

# 讲义笔记

## 1. sISA的局限性

在前面的我们成功地根据sISA设计出了简单处理器sCPU，并在其上运行了数列求和程序。但是sISA提供的指令有着局限性：

- li指令中的立即数用4bits表示，仅能装入立即数0～15到寄存器。
- bner0指令按绝对地址跳转，地址字段也是4bits，因此跳转目标范围也只有0～15。
- 当前的sISA不支持IO指令，要检查程序运行的结果只能手动查看寄存器的值，不方便。

![image.png](/images/posts/ysyx-f6/image.png)

## 2. 增强li和bner0

对li指令和bner0指令进行改进：

![image.png](/images/posts/ysyx-f6/image%201.png)

![image.png](/images/posts/ysyx-f6/image%202.png)

![image.png](/images/posts/ysyx-f6/image%203.png)

## 3. 添加io指令

![image.png](/images/posts/ysyx-f6/image%204.png)

![image.png](/images/posts/ysyx-f6/image%205.png)

## 4. 迈向现代化的处理器设计

![image.png](/images/posts/ysyx-f6/image%206.png)

![image.png](/images/posts/ysyx-f6/image%207.png)

![image.png](/images/posts/ysyx-f6/image%208.png)

![image.png](/images/posts/ysyx-f6/image%209.png)

# 讲义笔记

## 1. 改进后的sISA

首先增强 **li** 和 **bner0** 指令。然后再添加一条新的指令 **io**，用于寄存器与外部设备的I/O，得到的新sISA：

![image.png](/images/posts/ysyx-f6/image%2010.png)

- `add`指令的行为和之前相同
- `io`指令根据方向位`i/o`进行输入或输出:
    - 当`i/o=0`时, 表示输入操作, 从编号为`idx`的设备中读出8位数据, 输入到`R[rd]`中
    - 当`i/o=1`时, 表示输出操作, 将`R[rd]`中的8位数据, 输出到编号为`idx`的设备中
- `li`指令和之前相比有所不同, 它通过`s`和`imm`的组合来表示一个更大的立即数. 上文的`<<`表示左移运算符, 如果你不太熟悉这个运算符, 可以从另一个角度来理解`li`指令的行为: `s`表示将2位的`imm`放置在8位数据中的哪一段位置。

## 2. 增强li和bner0

![image.png](/images/posts/ysyx-f6/image%2011.png)

修改立即数生成器，使其能获取更新后的sISA所需的立即数：

![image.png](/images/posts/ysyx-f6/image%2012.png)

修改ALU中将立即数计算的部分，引入移位运算：

![image.png](/images/posts/ysyx-f6/image%2013.png)

在PC逻辑中添加PC相对寻址的电路：**PC = PC + sign_ext(offset)**

![image.png](/images/posts/ysyx-f6/image%2014.png)

重新编写数列求和程序：

```nasm
10000110    # 0: li r0, 1, 2       # r0 = 8
10010010    # 1: li r1, 0, 2       # r1 = 2
00000001    # 2: add r0, r0, r1    # r0 = r0 + r1 = 10

10010000    # 3: li r1, 0, 0       # r1 = 0
10100000    # 4: li r2, 0, 0       # r2 = 0
10110001    # 5: li r3, 0, 1       # r3 = 1

00010111    # 6: add r1, r1, r3
00101001    # 7: add r2, r2, r1

11111001    # 8: bner0 r1, -2
11000011    # 9: bner0 r3, 0
```

重新构造ROM，存储上述指令：

![image.png](/images/posts/ysyx-f6/image%2015.png)

使用sCPU来测试一下：

![image.png](/images/posts/ysyx-f6/image%2016.png)

可以看到在最后一次循环结束之前，检查ALU的输出为**00110111**，正是**1+2+…+10**的结果**55**。

![image.png](/images/posts/ysyx-f6/image%2017.png)

## 3. 增加io指令

修改控制器，让其输出io相关的控制信号，并且重构WE信号，在add指令、li指令和使用io指令进行输出时有效。

![image.png](/images/posts/ysyx-f6/image%2018.png)

因为引入了io指令，其使用指令格式中的rd字段索引寄存器，而在向IO设备输出数据时需要使用RADDR1或RADDR2来进行索引输出寄存器，因此这里加入一个MUX（我们选择Q2端口的输出数据作为IO设备的输入），修改控制器与寄存器文件之间的连接，当执行io指令时以rd字段作为RADDR2端口的输入。

![image.png](/images/posts/ysyx-f6/image%2019.png)

添加一个LED条作为第一个IO设备：

![image.png](/images/posts/ysyx-f6/image%2020.png)

在数列求和程序的最后加入一条**io指令**，用于驱动**LED条**显示存储在寄存器 **r2** 中的数列求和结果：

```nasm
10000110    # 0: li r0, 1, 2       # r0 = 8
10010010    # 1: li r1, 0, 2       # r1 = 2
00000001    # 2: add r0, r0, r1    # r0 = r0 + r1 = 10

10010000    # 3: li r1, 0, 0       # r1 = 0
10100000    # 4: li r2, 0, 0       # r2 = 0
10110001    # 5: li r3, 0, 1       # r3 = 1

00010111    # 6: add r1, r1, r3
00101001    # 7: add r2, r2, r1

11111001    # 8: bner0 r1, -2
**01101000    # 9: io r2, OUT, idx_0**
11111111    # 10: bner0 r3, -1
```

用我们修改后的sCPU运行该程序：

![image.png](/images/posts/ysyx-f6/image%2021.png)

可以看到LED条中顺利输出了55对应的二进制表示（这里图片放错了….）。

![image.png](/images/posts/ysyx-f6/image%2022.png)

加入两个16进制数码管，分别用于显示IO输出的高2字节和低2字节：

![image.png](/images/posts/ysyx-f6/image%2023.png)

在数列求和程序中修改**io**指令，使其将结果输出到**16进制数码管**：

```nasm
10000110    # 0: li r0, 1, 2       # r0 = 8
10010010    # 1: li r1, 0, 2       # r1 = 2
00000001    # 2: add r0, r0, r1    # r0 = r0 + r1 = 10

10010000    # 3: li r1, 0, 0       # r1 = 0
10100000    # 4: li r2, 0, 0       # r2 = 0
10110001    # 5: li r3, 0, 1       # r3 = 1

00010111    # 6: add r1, r1, r3
00101001    # 7: add r2, r2, r1

11111001    # 8: bner0 r1, -2
**01101001    # 9: io r2, OUT, idx_1**
11111111    # 10: bner0 r3, -1
```

测试一下：

![image.png](/images/posts/ysyx-f6/image%2024.png)

可以看到16进制数码管的输出为 3 和 7，即0x37，十进制值正好是55。

![image.png](/images/posts/ysyx-f6/image%2025.png)

重新编写sISA程序，首先执行io指令，从拨码开关中读入数据到GPR的**r2**寄存器，然后继续执行io指令，从**r2**中读出数据并输出到16进制数码管。

```nasm
10010000    # 0: li r1, 0, 0       # r1 = 0
10110001    # 1: li r3, 0, 1       # r3 = 1
**01100010    # 2: io r2, IN, idx_2**
**01101001    # 3: io r2, OUT, idx_1**
11111110    # 4: bner0 r3, -2
```

测试结果如下，可以看到16进制数码管中显示的数值和拨码开关中的值是相等的。

![image.png](/images/posts/ysyx-f6/image%2026.png)

![image.png](/images/posts/ysyx-f6/image%2027.png)

这个任务和拨码开关差不多，不重复了。