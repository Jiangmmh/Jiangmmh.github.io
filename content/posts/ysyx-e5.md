---
title: "一生一芯-E5阶段笔记"
date: '2026-10-27T23:30:27+08:00'
draft: false
tags: [Chisel, 芯片设计, verilator]
categories: [一生一芯]
---

在E4阶段中，我先使用Chisel（~~Verilog~~）实现了sISA，得到了sCPU，并在NVboard上进行了测试。然后为了提高调试效率，使用C/C++实现了一个sISA的模拟器sEMU，并以sCPU为DUT，以sEMU为REF，进行了Differential Test。

在这个阶段的内容中，我将实现一个仅支持8条指令（实际上是13条指令），但功能完备的RISC-V处理器（通过编译的方式使其模拟40条指令），它可以运行更多程序。

**在开始之前先总结一下处理器开发的思路：**

- 第一步：认真看手册！
    - 寄存器文件有多少个寄存器？位宽是多少？它们的功能？
    - 支持哪些指令？指令的格式与功能？
- 第二步：画出处理器的结构图
    - 画出架构图，描述清楚处理器各模块之间如何交互
- 第三步：使用Verilog/Chisel实现各组件
- 第四步：根据结构图将各组件连接起来

# **一、迷你RISC-V指令集**

> **RV32I共有42条指令**, 通过实现RV32I, 处理器已经足够完成绝大部分的计算工作。不过为了进一步降低开发的工作量, 我们提出了一个**"迷你RISC-V"指令集minirv**, 从RV32I中选出了**8条指令**, 用它们来替代其他RV32I指令的功能, **使得RV32I能完成的工作, minirv也能完成**。 这样, 我们就不必实现完整的42条RV32I指令, 也能让处理器运行更复杂的程序了。
> 

查看RISC-V手册，回答如下问题：

![image.png](/images/posts/ysyx-e5/image.png)

> **RV32I** 包含 **40 条独特的指令**，但一个简单的实现可能只需一条始终捕获异常的 SYSTEM 硬件指令即可涵盖 ECALL/EBREAK 指令，并且可能将 FENCE 指令实现为 NOP 指令，从而将基本指令总数减少到 38 条。
> 

**问题一：PC寄存器的位宽是多少？**

> RV32I有32 个x寄存器，均为 32 位宽，即XLEN=32。 寄存器的x0所有位均**硬连线**为 0。 通用寄存器x1-x31保存的值会被各种指令解释为布尔值集合、二进制补码有符号整数或无符号二进制整数。
还有一个额外的非特权寄存器：程序计数器pc 保存下一条指令的地址。
> 

<aside>
💡

回答：RV32I中的PC寄存器位宽为32。

</aside>

**问题二：GPR共有多少个? 每个GPR的位宽是多少?**

<aside>
💡

回答：RV32I包含32个GPR（x0～x31），位宽均为32位。

</aside>

**问题三：R[0]和sISA的R[0]有什么不同之处?**

<aside>
💡

回答：RV32I中的R[0]直接硬连线为0。

</aside>

**问题四：指令编码的位宽是多少? 指令有多少种基本格式?**

> 在 RV32I 基本指令集架构 (ISA) 中，有四种核心指令格式 (R/I/S/U)。

为了简化解码， RISC-V 指令集架构 (ISA) 将**源寄存器 ( rs1和rs2 )** 和**目标寄存器 ( rd )** 在所有格式中都**保持在相同的位置**。

除了 CSR 指令中使用的 5 位立即数（参见[CSR 指令](https://docs.riscv.org/reference/isa/v20260120/unpriv/zicsr.html#csrinsts)）之外，**所有立即数都经过符号扩展**，**并且通常被打包到指令的最左侧可用位**，这样做是为了降低硬件复杂度。特别地，所有立即数的符号位始终位于指令的第 31 位，以加快符号扩展电路的运行速度。
> 

![image.png](/images/posts/ysyx-e5/image%201.png)

<aside>
💡

回答：RV32I的指令编码的位宽为32位，有四种基本指令格式。

</aside>

根据对立即数的处理方式，指令格式还有另外两种变体（B/J），即一共有6种指令格式：

![image.png](/images/posts/ysyx-e5/image%202.png)

注意这里的B类型指令的拼接方式如下，其中imm[0]直接硬编码为0。

`imm[12:0] = {imm[12], imm[11], imm[10:5], imm[4:1], 1'b0}`

J类型也是类似的，在imm[0]处补上0。

**问题五：在指令的基本格式中, 需要多少位来表示一个GPR? 为什么?**

<aside>
💡

回答：需要5位来表示一个GPR，因为RV32I支持32个GPR，需要5个bits进行索引。

</aside>

**问题六：`add`指令的格式具体是什么?**

add指令为R型指令，格式如下图所示，其中还展示了若干其他的R型指令：

![image.png](/images/posts/ysyx-e5/image%203.png)

在第34章 “RV32/64G Instruction Set Listings” 中给出了各指令的opcode、funct3和funct7字段的值：

![image.png](/images/posts/ysyx-e5/image%204.png)

**问题七：还有一种基础指令集称为RV32E, 它和RV32I有什么不同?**

> 我们发现，在小型 RV32I 内核实现中，高 16 个寄存器占用了内核总面积（不包括存储器）的大约四分之一，因此移除它们可以节省大约 25% 的内核面积，并相应地降低内核功耗。
> 

<aside>
💡

回答：RV32E 的设计初衷是为嵌入式微控制器提供更小的基础内核。RV32E 和 RV64E 将整数寄存器数量减少到 **16 个通用寄存器**（x0-x15），其中x0是专用的零寄存器。

</aside>

# **二、实现minirv的指令集模拟器**

## **只有两条指令的minirvEMU**

![image.png](/images/posts/ysyx-e5/image%205.png)

在第二章中可以找到整数立即数指令的格式，其中就包含了addi指令。

> ADDI 指令将符号扩展的 12 位立即数加到寄存器rs1中。 算术溢出会被忽略，结果就是结果的低 XLEN 位。ADDI rd, rs1, 0用于实现汇编伪指令MV rd, rs1 。
> 

![image.png](/images/posts/ysyx-e5/image%206.png)

在最新的pdf版本ISA Manual的第36章中包含了全部指令的opcode和funct3编码表，这里是addi指令的编码，可以看到其opcode为0010011，funct3为000 。

![image.png](/images/posts/ysyx-e5/image%207.png)

![image.png](/images/posts/ysyx-e5/image%208.png)

阅读手册1.4节，得到如下信息：

- 一个 RISC-V 核心包含了一个单字节寻址的内存地址空间，大小为2^{XLEN}。
- 一个 *word*（字）长度为32位，对应的 *halfword*（半字）长度为16位，*doubleword*（双字）为64位，*doubleword*（四字）为128为。
- 在RISC-V核心的地址空间中，一部分是内存，另一部分是I/O设备。
- 执行每条 RISC-V 机器指令都涉及一次或多次内存访问，每次取指令都会访问一次，load和store指令会再访问一次内存。
- 如果指令尝试访问不可访问的地址，则会为该指令引发异常。
- RISC-V 采用**弱内存模型（RVWMO）**，允许硬件为了性能对内存访问重排序。
    - 不同访问方式（取指/加载/存储）可见的地址范围不同，隐式读取可以推测性提前。
    - 软件若需要严格顺序，必须使用 FENCE（内存屏障）和 FENCE.I（指令隔离）等同步指令。

<aside>
💡

RV32I中的内存地址空间需要按照单字节寻址，而指令位宽为32位，因此每次取指时PC需要+4。

</aside>

关于译码的问题，需要考虑如下问题：

- 通过opcode和funct3字段的值来确定所执行的是何种指令。
    
    ```c
    is_addi = (inst[6:0] == ?) && (inst[14:12] == ?)
    ```
    
- 由于指令中的立即数位宽较短, 要与位宽较长的GPR进行计算, 要先对立即数进行符号扩展。

![image.png](/images/posts/ysyx-e5/image%209.png)

这部分内容在手册第二章的第5小节中：

> 间接跳转指令 JALR（跳转和链接寄存器）使用 I 型编码。 目标地址通过将符号扩展的 12 位 I 型立即数加到寄存器*rs1*上得到，然后将结果的最低有效位置零。
> 

JALR的功能和指令格式如下：

```c
rd = PC + 4                # 保存返回地址
PC = (rs1 + offset) & ~1   # 跳转（最低位清零）
```

![image.png](/images/posts/ysyx-e5/image%2010.png)

对应的opcode和funct3如下：

![image.png](/images/posts/ysyx-e5/image%2011.png)

![image.png](/images/posts/ysyx-e5/image%2012.png)

参照先前实现的sEMU，实现支持两条指令addi和jalr的minirvEMU，思路大体一致，但存在少许细节值得注意：

- 在RV32I中，一条指令的位宽为32位，但是由于内存需要按字节寻址，因此一个内存单位仍为18位，在获取指令和递增PC时需要注意到这一点。
- 在从program.hex中读取指令时，需要注意：一行表示一条指令，共4字节

```c
// minirvEMU.cpp
#include <iostream>
#include <cstdint>
#include <assert.h>
#include "minirvEMU.h"

uint32_t PC; 
uint32_t R[32];
uint8_t M[65536];  // 内存地址空间暂时仅支持65536个字节
 

int main() {
    miniRV_init();
    
    while (1) {
        inst_cycle();

        if (PC == 0xc) {
            printf("Result = %d\n", R[10]);
            break;
        }
    }

    return 0;
}

void inst_cycle() {
    uint32_t inst = M[PC] | (M[PC+1] << 8) | (M[PC+2] << 16) | (M[PC+3] << 24);
    PC += 4;
    int32_t imm = (int32_t)inst >> 20;          // 符号扩展
    uint32_t rs1 = (inst >> 15) & 0x1f;
    uint32_t rd = (inst >> 7) & 0x1f;
    uint32_t funct3 = (inst >> 12) & 0x7;
    uint32_t opcode = inst & 0x7f;

    if (opcode == 0x13 && funct3 == 0) {
        // addi
        uint32_t result = R[rs1] + imm;
        if (rd != 0) R[rd] = result;            // x0 恒为 0
    } else if (opcode == 0x67 && funct3 == 0) {
        // jalr
        // 先用旧 rs1 计算目标并清最低位, 再写 rd
        uint32_t target = (R[rs1] + imm) & ~1U;
        if (rd != 0) R[rd] = PC;
        PC = target;
    } else {
        printf("Error: invalid instruction\n");
        assert(0);
    }
}

void miniRV_init() {
    PC = 0;
    for (int i = 0; i < 32; i++) R[i] = 0;
    for (int i = 0; i < 65536; i++) M[i] = 0;

    FILE *fp = fopen("program.hex", "r");
    if (fp == NULL) {
        fprintf(stderr, "miniRV EMU: cannot open program.hex (run from the build directory)\n");
        exit(1);
    }
		
    uint32_t v;
    for (int i = 0; i < 16384 && fscanf(fp, "%x", &v) == 1; i++) {
        M[i*4 + 0] = (v >>  0) & 0xFF;   // 低字节
        M[i*4 + 1] = (v >>  8) & 0xFF;
        M[i*4 + 2] = (v >> 16) & 0xFF;
        M[i*4 + 3] = (v >> 24) & 0xFF;   // 高字节
    }
    
    fclose(fp);
}
```

```c
// minirvEMU.h

#ifndef __MINIRV_EMU__
#define __MINIRV_EMU__

void inst_cycle();
void miniRV_init();

#endif
```

指令的十六进制形式如下：

```bash
01400513
010000e7
00c000e7
00c00067
00a50513
00008067
```

编写Makefile：

```bash
CXX      = g++
CXXFLAGS = -Wall -O2

TARGET = minirvEMU

$(TARGET): minirvEMU.cpp minirvEMU.h
	$(CXX) $(CXXFLAGS) -o $@ minirvEMU.cpp

run: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET)

.PHONY: run clean
```

我们来测试一下执行的效果：

```bash
xi@tanxi:~/ysyx/ysyx-project/minirvEMU$ make run
g++ -Wall -O2 -o minirvEMU minirvEMU.cpp
./minirvEMU
Result = 30
```

![image.png](/images/posts/ysyx-e5/image%2013.png)

修改指令：我们在其中加一条立即数为负数的addi指令，检查符号扩展是否正确。

```nasm
00000000 <_start>:
   0:	01400513          	addi	a0,zero,20
   4:	010000e7          	jalr	ra,16(zero) # 10 <fun>
   8:	00c000e7          	jalr	ra,12(zero) # c <halt>

0000000c <halt>:
   c:	00c00067          	jalr	zero,12(zero) # c <halt>

00000010 <fun>:
  10:	00a50513          	addi	a0,a0,10
  14: ff650513            addi  a0,a0,-10   # 新增指令！！！
  16:	00008067          	jalr	zero,0(ra)
```

更新`program.hex`：

```bash
01400513
010000e7
00c000e7
00c00067
00a50513
ff650513
00008067
```

测试一下：

```bash
minirvEMU ➜ make run
g++ -Wall -O2 -o minirvEMU minirvEMU.cpp
./minirvEMU
Result = 20
```

## **实现完整的minirvEMU**

接下来, 我们考虑如何实现minirv的剩余6条指令。

![image.png](/images/posts/ysyx-e5/image%2014.png)

`add`指令的格式和编码：

![image.png](/images/posts/ysyx-e5/image%2015.png)

![image.png](/images/posts/ysyx-e5/image%2016.png)

`lui`指令的格式和编码：

![image.png](/images/posts/ysyx-e5/image%2017.png)

![image.png](/images/posts/ysyx-e5/image%2018.png)

LUI（加载高位立即数）用于构建 32 位常量，并使用 U 型格式。LUI 将 32 位 U 型立即数值放入目标寄存器rd，并将最**低 12 位填充为零**。

修改minirvEMU.cpp中的inst_cycle函数，添加对这两条指令的支持：

```c
void inst_cycle() {
    uint32_t inst = M[PC] | (M[PC+1] << 8) | (M[PC+2] << 16) | (M[PC+3] << 24);
    PC += 4;
    int32_t imm_I = (int32_t)inst >> 20;        
    uint32_t rs1 = (inst >> 15) & 0x1f;
    uint32_t rs2 = (inst >> 20) & 0x1f;
    uint32_t rd = (inst >> 7) & 0x1f;
    uint32_t funct3 = (inst >> 12) & 0x7;
    uint32_t funct7 = (inst >> 25) & 0x7f;
    uint32_t opcode = inst & 0x7f;

    if (opcode == 0x13 && funct3 == 0) {
        // addi
        uint32_t result = R[rs1] + imm_I;
        if (rd != 0) R[rd] = result;            // x0 恒为 0
    } else if (opcode == 0x67 && funct3 == 0) {
        // jalr
        // 先用旧 rs1 计算目标并清最低位, 再写 rd
        uint32_t target = (R[rs1] + imm_I) & ~1U;
        if (rd != 0) R[rd] = PC;
        PC = target;
    }  else if (opcode == 0x33 && funct3 == 0 && funct7 == 0) {
        // add
        if (rd != 0) {
            R[rd] = R[rs1] + R[rs2];
        }
    } else if (opcode == 0x37) {
        // lui
        if (rd != 0) {
             R[rd] = inst & 0xFFFFF000;
        }
    }
    else {
        printf("Error: invalid instruction\n");
        assert(0);
    }
	}
```

测试程序如下，预期输出为Result = 12272：

```nasm
0x00: lui   t0, 0x1          # t0 = 0x1000 (4096)     ← 测 lui
0x04: addi  t1, zero, -16    # t1 = -16               ← 测负立即数符号扩展
0x08: jalr  ra, 32(zero)     # 跳到 0x20, ra = 0x0c
0x0c: jalr  zero, 12(zero)   # halt(不会真正执行到)
0x10~0x1c: nop ×4            # 填充

0x20: add   t2, t0, t1       # t2 = 4096 - 16 = 4080  ← 测 add + 负操作数
0x24: lui   a0, 0x2          # a0 = 0x2000 (8192)     ← 测 lui 写 a0
0x28: add   a0, a0, t2       # a0 = 8192 + 4080       ← 测 rd==rs1 的 add
0x2c: jalr  zero, 0(ra)      # 返回 0x0c → halt
```

对应的十六进制格式如下，将其写入`program.hex`中：

```bash
000012b7
ff000313
020000e7
00c00067
00000013
00000013
00000013
00000013
006283b3
00002537
00750533
00008067
```

测试一下：

```bash
minirvEMU ➜ make run
g++ -Wall -O2 -o minirvEMU minirvEMU.cpp
./minirvEMU
Result = 12272
```

![image.png](/images/posts/ysyx-e5/image%2019.png)

RV32I 是一种**`load/store`**架构的ISA，其中只有load和store指令能够访问内存，算术指令仅操作 CPU 寄存器。RV32I 提供一个 32 位字节寻址的地址空间。

> **EEI (Execution Environment Interface)**，即**执行环境接口**，是 RISC-V 架构中的一个核心抽象概念。它指的是**软件（如操作系统或应用程序）所面对的硬件与底层软件资源的抽象集合。**
> 

**`EEI`** 将定义哪些地址空间部分允许哪些指令访问。EEI 将定义内存系统是小端序还是大端序。 在 RISC-V 中，字节序与字节地址无关。

EEI 决定了程序**能做什么**以及**不能做什么**，具体包括：

- **内存访问**：EEI 规定了地址空间中哪些部分可读、可写、可执行。例如，它决定了取指令的地址集是否与加载指令的地址集重叠，以及存储指令可写的地址是否是加载指令可读地址的子集。
- **异常与中断**：当程序尝试访问非法地址或发生对齐错误时，EEI 决定了该行为是触发一个可由软件处理的**包含陷阱 (Contained Trap)**，还是导致程序终止的**致命陷阱 (Fatal Trap)**。
- **资源管理**：EEI 定义了可用的硬件线程（hart）资源，以及是否支持创建或销毁新的 hart

![image.png](/images/posts/ysyx-e5/image%2020.png)

Load指令采用 **I 型编码**，Store指令采用 **S 型编码**。但两者均使用相同的方式计算内存地址：

- **有效地址 = R[rs1] + sign_extend(offset)**

load指令的opcode为0000011 **，**store指令的opcode为0100011 。

> 这里的offset就是load/store指令中的立即数。
> 

Load类的指令：

![image.png](/images/posts/ysyx-e5/image%2021.png)

Store类的指令：

![image.png](/images/posts/ysyx-e5/image%2022.png)

![image.png](/images/posts/ysyx-e5/image%2023.png)

![image.png](/images/posts/ysyx-e5/image%2024.png)

![image.png](/images/posts/ysyx-e5/image%2025.png)

关于**字节序**：**RISC-V规范强制使用小端法**，多字节数值的最低有效字节存放在最低地址（低位字节应当存放在内存的低地址处）。

我的实现：

```c
void inst_cycle() {
    uint32_t inst = M[PC] | (M[PC+1] << 8) | (M[PC+2] << 16) | (M[PC+3] << 24);
    PC += 4;
    int32_t imm_I = (int32_t)inst >> 20;        
    int32_t imm_S = (int32_t)(inst & 0xfe000000) >> 20   // imm[11:5] → bit11:5
              | ((inst >> 7) & 0x1f);                   // imm[4:0] → bit4:0
    int32_t imm_B = (((int32_t)inst >> 31) << 12)      // imm[12]
              | (((inst >> 7) & 0x1) << 11)            // imm[11]
              | (((inst >> 25) & 0x3f) << 5)           // imm[10:5]
              | (((inst >> 8) & 0xf) << 1);            // imm[4:1]
    int32_t imm_J = (((int32_t)inst >> 31) << 20)          // imm[20]
              | (((inst >> 12) & 0xff) << 12)          // imm[19:12]
              | (((inst >> 20) & 0x1) << 11)           // imm[11]
              | (((inst >> 21) & 0x3ff) << 1);         // imm[10:1]
    uint32_t rs1 = (inst >> 15) & 0x1f;
    uint32_t rs2 = (inst >> 20) & 0x1f;
    uint32_t rd = (inst >> 7) & 0x1f;
    uint32_t funct3 = (inst >> 12) & 0x7;
    uint32_t funct7 = (inst >> 25) & 0x7f;
    uint32_t opcode = inst & 0x7f;

    if (opcode == 0x13 && funct3 == 0) {
        // addi
        uint32_t result = R[rs1] + imm_I;
        if (rd != 0) R[rd] = result;            // x0 恒为 0
    } else if (opcode == 0x67 && funct3 == 0) {
        // jalr
        // 先用旧 rs1 计算目标并清最低位, 再写 rd
        uint32_t target = (R[rs1] + imm_I) & ~1U;
        if (rd != 0) R[rd] = PC;
        PC = target;
    }  else if (opcode == 0x33 && funct3 == 0 && funct7 == 0) {
        // add
        if (rd != 0) {
            R[rd] = R[rs1] + R[rs2];
        }
    } else if (opcode == 0x37) {
        // lui
        if (rd != 0) {
             R[rd] = inst & 0xFFFFF000;
        }
    } else if (opcode == 0x03) {
        uint32_t addr = R[rs1] + imm_I;
        // load
        uint32_t result = 0;
        switch (funct3)
        {
        case 0x0:
            // lb: 显式符号扩展, 避免有符号左移 UB
            result = (uint32_t)(int32_t)(int8_t)M[addr];
            break;
        case 0x1:
            // lh
            result = (uint32_t)(int32_t)(int16_t)(((uint32_t)M[addr+1] << 8) | M[addr]);
            break;
        case 0x2:
            // lw
            result = ((uint32_t)M[addr+3] << 24) | ((uint32_t)M[addr+2] << 16)
                   | ((uint32_t)M[addr+1] << 8) | M[addr];
            break;
        case 0x4:
            // lbu
            result = M[addr];
            break;
        case 0x5:
            // lhu
            result = ((uint32_t)M[addr+1] << 8) | M[addr];
            break;
        default:
            printf("Error: invalid load funct3\n");
            assert(0);
        }
        if (rd != 0) R[rd] = result;            // x0 恒为 0
    } else if (opcode == 0x23) {
        // store: S 型没有 rd 字段, 要写的数据在 rs2 中
        uint32_t addr = R[rs1] + imm_S;
        switch (funct3)
        {
        case 0x0:
            // sb
            M[addr] = R[rs2] & 0xff;
            break;
        case 0x1:
            // sh
            M[addr]     =  R[rs2] & 0xff;
            M[addr+1]   = (R[rs2] >> 8) & 0xff;
            break;
        case 0x2:
            // sw
            M[addr]     =  R[rs2] & 0xff;
            M[addr+1]   = (R[rs2] >> 8) & 0xff;
            M[addr+2]   = (R[rs2] >> 16) & 0xff;
            M[addr+3]   = (R[rs2] >> 24) & 0xff;
            break;
        default:
            printf("Error: invalid store funct3\n");
            assert(0);
        }
    } else {
        printf("Error: invalid instruction\n");
        assert(0);
    }
}
```

编写测试程序：

```nasm
# ===== 序幕: t0 = 数据地址 a, 跳到测试体, 返回点即 halt 检测地址 0x0c =====
0x00:  10000293    addi  t0, zero, 256     # t0 = a = 0x100
0x04:  00000013    nop                     # (填充)
0x08:  020000e7    jalr  ra, 32(zero)      # 跳到 0x20, ra = 0x0c
0x0c:  00c00067    jalr  zero, 12(zero)    # halt 桩(不会真正执行到)

0x10:  00000013    nop                     # ── 填充, 令测试体对齐到 0x20 ──
0x14:  00000013    nop
0x18:  00000013    nop
0x1c:  00000013    nop

# ===== 测试体 =====
0x20:  12345337    lui   t1, 0x12345       # \
0x24:  67830313    addi  t1, t1, 1656      # / li t1, 0x12345678
0x28:  0062a023    sw    t1, 0(t0)         # M[a..a+3] = 78 56 34 12

0x2c:  0002a383    lw    t2, 0(t0)         # 应读出 0x12345678
0x30:  edcbb4b7    lui   s1, 0xEDCBB       # \
0x34:  98848493    addi  s1, s1, -1656     # / li s1, -0x12345678
0x38:  00750533    add   a0, a0, t2        # a0 += lw 实际值
0x3c:  00950533    add   a0, a0, s1        # a0 += -0x12345678   → 正确则净变化 0

0x40:  0002c383    lbu   t2, 0(t0)         # 应 = 0x78
0x44:  00750533    add   a0, a0, t2
0x48:  f8850513    addi  a0, a0, -120      # - 0x78              → 净变化 0
0x4c:  0012c383    lbu   t2, 1(t0)         # 应 = 0x56
0x50:  00750533    add   a0, a0, t2
0x54:  faa50513    addi  a0, a0, -86       # - 0x56
0x58:  0022c383    lbu   t2, 2(t0)         # 应 = 0x34
0x5c:  00750533    add   a0, a0, t2
0x60:  fcc50513    addi  a0, a0, -52       # - 0x34
0x64:  0032c383    lbu   t2, 3(t0)         # 应 = 0x12
0x68:  00750533    add   a0, a0, t2
0x6c:  fee50513    addi  a0, a0, -18       # - 0x12

0x70:  0ef00313    addi  t1, zero, 0xef    # li t1, 0xef (addi 配合 x0)
0x74:  00628023    sb    t1, 0(t0)         # a   ← 0xef
0x78:  0cd00313    addi  t1, zero, 0xcd
0x7c:  006280a3    sb    t1, 1(t0)         # a+1 ← 0xcd
0x80:  0ab00313    addi  t1, zero, 0xab
0x84:  00628123    sb    t1, 2(t0)         # a+2 ← 0xab
0x88:  09000313    addi  t1, zero, 0x90
0x8c:  006281a3    sb    t1, 3(t0)         # a+3 ← 0x90

0x90:  0002a383    lw    t2, 0(t0)         # 应读出 0x90abcdef
0x94:  00750533    add   a0, a0, t2        # a0 = 误差 + 0x90abcdef
0x98:  00008067    jalr  zero, 0(ra)       # 返回 0x0c → halt, 打印 a0
```

程序指令的十六进制格式如下：

```bash
10000293
00000013
020000e7
00c00067
00000013
00000013
00000013
00000013
12345337
67830313
0062a023
0002a383
edcbb4b7
98848493
00750533
00950533
0002c383
00750533
f8850513
0012c383
00750533
faa50513
0022c383
00750533
fcc50513
0032c383
00750533
fee50513
0ef00313
00628023
0cd00313
006280a3
0ab00313
00628123
09000313
006281a3
0002a383
00750533
00008067
```

将其写入program.hex，结果应当为：**Result = -1867788817 = 0x90abcdef** 

```nasm
minirvEMU ➜ make run
g++ -Wall -O2 -o minirvEMU minirvEMU.cpp
./minirvEMU
Result = 0x90abcdef
```

## **让程序决定模拟器何时结束**

> 我们刚才是minirvEMU一直运行, 直到程序陷入一个预期的死循环, 来表示程序运行结束; 或者让minirvEMU来执行指定的指令数量后结束。
> 

![image.png](/images/posts/ysyx-e5/image%2026.png)

我们可以**添加一条ebreak指令, 并将其功能定义为程序结束**。为了实现程序结束的自动判断, 我们约定, 让minirvEMU执行ebreak指令后结束整个程序的执行, 并输出一些提示信息。

> SYSTEM instructions are used to access system functionality that might require privileged access and are encoded using the I-type instruction format.
> 

ebreak和ecall都是系统指令，被用于访问系统的功能（可能需要特权），它们被编码为I类型的指令格式。

ebreak指令的格式和编码如下：

![image.png](/images/posts/ysyx-e5/image%2027.png)

![image.png](/images/posts/ysyx-e5/image%2028.png)

实现ebreak，并在其中输出提示信息和a0寄存器的值（保存运算结果），然后通过exit退出：

```nasm
void inst_cycle() {
		............
    else if (inst == 0x00100073) {
        // ebreak: 终止minirvEMU
        printf("minirvEMU: hit EBREAK at PC = 0x%x, a0 = 0x%x, halted\n", PC - 4, R[10]);
        exit(0);
    } else {
        printf("Error: invalid instruction\n");
        assert(0);
    }
}
```

重新构造一个程序，并更新`program.hex`：

```nasm
0x00: 00c00513  addi  a0, zero, 12
0x04: 02200593  addi  a1, zero, 34
0x08: 00b50533  add   a0, a0, a1      # a0 = 46
0x0c: 000012b7  lui   t0, 0x1         # t0 = 4096
0x10: 00550533  add   a0, a0, t0      # a0 = 0x102e
0x14: 00100073  ebreak                # 停机
```

```bash
00c00513
02200593
00b50533
000012b7
00550533
00100073
```

在该程序中将a0置为46，将t0置为4096，然后使两者相加，结果存储a0。

测试一下：

```bash
minirvEMU ➜ make run
g++ -Wall -O2 -o minirvEMU minirvEMU.cpp
./minirvEMU
minirvEMU: hit EBREAK at PC = 0x14, a0 = 0x102e, halted
```

# **三、用RTL实现minirv NPC**

前面我们已经实现了支持8条指令（实际上是12条）的模拟器minirvEMU，现在该真正使用RTL将sCPU升级为minirv处理器了！

## **模块化的RTL设计**

和sCPU不同, 将来我们还会不断改进NPC, 在其中添加更多的功能。例如, 在D阶段中, 你将会在NPC中实现约40条指令. 因此, 需要通过模块化的方式维护NPC项目, 为将来的改进做好准备。

根据minirv处理器支持的功能，划分出若干模块：

- **IFU(Instruction Fetch Unit):** 负责根据当前PC从存储器中取出一条指令
- **IDU(Instruction Decode Unit)**: 负责对当前指令进行译码, 准备执行阶段需要使用的数据和控制信号
- **EXU(EXecution Unit):** 负责根据控制信号控制ALU, 对数据进行计算
- **LSU(Load-Store Unit)**: 负责根据控制信号控制存储器, 从存储器中读出数据, 或将数据写入存储器
- **WBU(WriteBack Unit)**: 将数据写入寄存器, 并更新PC

> 你需要自行梳理出模块之间的接口。当然, 你也可以自行决定将哪些部件放置在哪一个模块中. 一个例外是存储器, 为了方便测试, 我们不打算通过RTL来实现这个存储器, 而是用C++来实现它. 当前, 我们先考虑一种最简单的实现方式: 将存储器访问接口的信号拉到顶层, 通过C++代码来访问存储器。
> 

![image.png](/images/posts/ysyx-e5/image%2029.png)

![image.png](/images/posts/ysyx-e5/image%2030.png)

### GPR的设计

首先修改寄存器的实现，使其支持32位：

```verilog
module register32(
    input clk, we, rst,
    input [31:0] D,
    output reg [31:0] Q
);
    
    always @(posedge clk) begin
        if (rst) 
            Q <= 0;
        else if (we) begin
            Q <= D;
        end
    end
    
endmodule
```

然后修改gpr.v ，该GPR应当支持32个32位寄存器，其中第一个寄存器x0接地，持续输出0，且无法写入。

- 通过对waddr进行特判，在遇到waddr为0时，将wen置为0，避免写入x0
- 通过对raddr1和raddr2进行特判，在遇到访问x0时，直接输出0

```verilog
module gpr (
    input        clk,
    input        rst,
    input        en,
    input  [4:0] waddr, raddr1, raddr2,
    input  [31:0] D,
    output [31:0] Q1, Q2
);
    wire [31:0] q_out [0:31];
    wire [31:0] wen;

    // 如果waddr为0，将写使能信号置为0
    assign wen = (waddr == 5'd0) ? 32'b0 : (32'b1 << waddr);

    // 创建32个32位寄存器实例
    genvar i;
    generate
        for (i = 0; i < 32; i = i + 1) begin : gen_regs
            register32 reg_inst (
                .clk(clk),
                .we (en & wen[i]),  
                .rst(rst),
                .D  (D),
                .Q  (q_out[i])
            );
        end
    endgenerate

    // 为了保持x0接地，读出时也需要对x0进行特判
    assign Q1 = (raddr1 == 5'd0) ? 32'b0 : q_out[raddr1];
    assign Q2 = (raddr2 == 5'd0) ? 32'b0 : q_out[raddr2];

endmodule
```

下面是我的Chisel实现，其中包含两个参数xlen和nRegs，分别用于控制寄存器位宽和寄存器数量，方便后续的扩展。

```scala
import chisel3._
import chisel3.util._

/**
 * 寄存器堆（默认为RV32I）
 *
 * 参数：
 *   - xlen  : 寄存器位宽（XLEN）。RV32I 为 32，RV64I 为 64
 *   - nRegs : 通用寄存器个数。RV32I / RV64I 均为 32（RV32E 为 16）
 *
 * 结构：
 *   - x0 恒为 0：硬连线（hardwired），读出恒为 0，写入被丢弃
 *   - x1 ~ x(nRegs-1) 为通用寄存器，存放指令解释的布尔值 / 二进制补码有符号整数 / 无符号整数
 *   - pc：当前指令地址，属于额外的非特权寄存器，由本工程的 PC 模块单独实现
 *
 * 接口：2 个组合读口（rs1 / rs2）+ 1 个同步写口（rd / we / data）
 * 调试口 regs 输出全部寄存器的值（regs(0) 恒为 0）
 *
 * 用法：
 *   new RegFile                 // RV32I：32 个 32 bit 寄存器
 *   new RegFile(xlen = 64)       // RV64I：32 个 64 bit 寄存器
 *   new RegFile(nRegs = 16)      // RV32E：16 个 32 bit 寄存器
 */
class RegFile(val xlen: Int = 32, val nRegs: Int = 32) extends Module {
  require(xlen > 0, "xlen 必须为正数")
  require(nRegs >= 2, "nRegs 至少为 2（x0 恒为 0，至少还要有一个通用寄存器）")

  // 寄存器编号位宽：log2(nRegs)
  val idxWidth = log2Ceil(nRegs)

  val io = IO(new Bundle {
    val rs1  = Input(UInt(idxWidth.W))
    val rs2  = Input(UInt(idxWidth.W))
    val rd   = Input(UInt(idxWidth.W))
    val data = Input(UInt(xlen.W))
    val we   = Input(Bool())

    val out1 = Output(UInt(xlen.W))           // R[rs1]
    val out2 = Output(UInt(xlen.W))           // R[rs2]
    val regs = Output(Vec(nRegs, UInt(xlen.W))) // 调试口：R[0..nRegs-1]
  })

  // nRegs 个 xlen bit 寄存器
  val regs = RegInit(VecInit(Seq.fill(nRegs)(0.U(xlen.W))))

  // 写回：写 x0 被丢弃，因此 regs(0) 永远不会被改写
  when (io.we && (io.rd =/= 0.U)) {
    regs(io.rd) := io.data
  }
  
  // 读出：x0 硬连线为 0
  io.out1 := Mux(io.rs1 === 0.U, 0.U(xlen.W), regs(io.rs1))
  io.out2 := Mux(io.rs2 === 0.U, 0.U(xlen.W), regs(io.rs2))
  io.regs := regs
}
```

### 立即数生成器的设计

根据RV32I文档中的定义的格式编写立即数生成器，注意：

- B类型和J类型的立即数都要在最低位补一个0
- U类型的立即数需要在低12位补零

> 这部分比较简单，因此直接将RV32I所需的全部立即数都提取出来。
> 

![image.png](/images/posts/ysyx-e5/image%2031.png)

```verilog
module imm_gen (
    input [31:0] inst,
    output [31:0] imm_I,
    output [31:0] imm_S,
    output [31:0] imm_B,
    output [31:0] imm_U,
    output [31:0] imm_J
);  
		
    // 除了U类型指令中的立即数需要零扩展外，所有立即数都需要进行符号扩展
    assign imm_I = {{20{inst[31]}}, inst[31:20]};
    assign imm_S = {{20{inst[31]}}, inst[31:25], inst[11:7]};
    assign imm_B = {{19{inst[31]}}, inst[31], inst[7], 
                    inst[30:25], inst[11:8], 1'b0};
    assign imm_U = {inst[31:12], 12'd0};
    assign imm_J = {{12{inst[31]}}, inst[19:12], inst[20], 
                    inst[30:21], 1'b0};

endmodule
```

Chisel实现如下，立即数生成器就不考虑参数化了，因为其他扩展架构的指令中立即数解析逻辑可能不同，因此最好是针对不同扩展架构设计自己的立即数生成器。

```scala
import chisel3._
import chisel3.util._

/**
 * 立即数生成器（RISC-V RV32I）
 *
 * 5 种立即数格式，全部由 32 bit 指令 inst 直接拼接得到：
 *   I 类型：imm = inst[31:20]                          符号扩展
 *   S 类型：imm = inst[31:25] , inst[11:7]             符号扩展
 *   B 类型：imm = inst[31] , inst[7] , inst[30:25] ,
 *                 inst[11:8] , 1'b0                    符号扩展（最低位恒 0）
 *   U 类型：imm = inst[31:12] , 12'd0                  零扩展
 *   J 类型：imm = inst[31] , inst[19:12] , inst[20] ,
 *                 inst[30:21] , 1'b0                   符号扩展（最低位恒 0）
 *
 * 除了 U 类型指令中的立即数需要零扩展外，所有立即数都需要进行符号扩展。
 */
class ImmGen extends Module {
  val io = IO(new Bundle {
    val inst = Input(UInt(32.W))

    val imm_I = Output(UInt(32.W))
    val imm_S = Output(UInt(32.W))
    val imm_B = Output(UInt(32.W))
    val imm_U = Output(UInt(32.W))
    val imm_J = Output(UInt(32.W))
  })

  val inst = io.inst
	
  io.imm_I := Cat(Fill(20, inst(31)), inst(31, 20))
  io.imm_S := Cat(Fill(20, inst(31)), inst(31, 25), inst(11, 7))
  io.imm_B := Cat(Fill(19, inst(31)), inst(31), inst(7), inst(30, 25), inst(11, 8), 0.U(1.W))
  io.imm_U := Cat(inst(31, 12), 0.U(12.W))
  io.imm_J := Cat(Fill(12, inst(31)), inst(19, 12), inst(20), inst(30, 21), 0.U(1.W))
}

```

### 关于PC的设计

在上一阶段我们设计的sCPU中仅支持addi和jalr两条指令，所以PC的更新逻辑仅有PC += 4和PC = jump_target 两种情况，这里通过 branch 信号（由控制器生成）来控制PC的更新。

```scala
val branchTaken = ctrl.io.branch && (rf.io.regs(0) =/= rf.io.out2)
pc.io.next := Mux(branchTaken, pc.io.pc + immGen.io.imm, pc.io.pc + 1.U)
```

```scala
import chisel3._

/**
 * 程序计数器 PC
 *
 * 指令宽度 8 bit，PC 按「指令条数」计数：每执行一条指令 +1；
 * 分支跳转时 PC = PC + sign_ext(offset)（基准为分支指令自身的 PC）。
 * PC 用 32 bit 实现，取低 8 bit 去索引指令 ROM，越界后自然回绕。
 */
class PC extends Module {
  val io = IO(new Bundle {
    val next = Input(UInt(32.W))  // 下一条指令的地址
    val pc   = Output(UInt(32.W)) // 当前指令的地址
  })

  val pcReg = RegInit(0.U(32.W))
	
  pcReg := io.next
  io.pc := pcReg
}
```

下面我们进一步探讨PC模块的设计。

> **关键问题：如何界定PC模块的功能？**
> 

RISC-V 手册里 PC 是状态元件(state element):它在架构上是"当前指令地址"这一个寄存器。至于"下一条指令地址怎么算"，规范只定义了行为(PC+4,或分支/跳转目标)，没有规定模块如何拆分。

现在有两种实现PC模块的方案：

- 方案 A：将 PC 视为一个纯寄存器，更新逻辑在顶层/控制单元（我现在的做法）
- 方案 B：PC = 寄存器 + 递增器 + 目标选择 mux,内部算好 nextPc

其中的权衡如下：

- 如果设计目标是单周期处理器，那么两种方案都可以
- 如果设计目标是支持流水线的处理器，那么必须将存储和获取下一条指令地址的逻辑分开
    - IF 阶段：要 pc + 4(无分支时继续取下一条)
    - ID/EX 阶段：算出分支指令目标的地址，要回灌给 IF 阶段，让它下一拍去取目标地址处的指令

我的结论：依然保留方案A的设计，将PC视为一个纯寄存器，PC的更新逻辑放到模块之外进行。

下面是使用Chisel实现的PC模块，包含两个参数 xlen 和 initAddr，前者用于决定PC的位宽，后者决定PC的初值（第一条指令的地址）。

```scala
import chisel3._

/**
 * 程序计数器 PC
 *
 * PC 是 RISC-V 的状态元件，只保存「当前指令的地址」这一个寄存器。
 * 下一条指令的地址（PC+4、分支/跳转目标）由取指阶段和控制单元算好后
 * 通过 next 送进来，本模块不做任何地址计算。
 *
 * 参数：
 *   - xlen    : 地址宽度（XLEN）。RV32I 为 32，RV64I 为 64
 *   - initAddr: 复位后的初始地址（用 BigInt，0x80000000 超出 Int 范围）
 *
 * 注意：PC 的宽度是 xlen（架构地址空间），不是指令存储器的索引宽度；
 *   截断到 ROM 索引宽度这一步在取指阶段做，PC 本身保持 xlen 宽。
 */
class PC(val xlen: Int = 32, val initAddr: BigInt = 0) extends Module {
  require(xlen > 0, "xlen 必须为正数")
  
  val io = IO(new Bundle {
    val next = Input(UInt(xlen.W))  // 下一条指令的地址
    val pc   = Output(UInt(xlen.W)) // 当前指令的地址
  })

  val pcReg = RegInit(initAddr.U(xlen.W))
	
  pcReg := io.next
  io.pc := pcReg
}
```

### ALU的设计

首先定义一个文件ISA.scala：

- 在其中定义一些枚举值，注意这里使用的是 ChiselEnum 而不是裸数字,是因为译码器和 ALU 两边要用同一个名字。
    - ALUOp 定义了ALU的运算类型
    - ImmType 定义了立即数的格式，后续传入立即数生成器
    - MemSize 定义了访存的位宽
    - Op1Sel 定义了第一个操作数的来源，rs1 或者 0。
    - Op2Sel 定义了第二个操作数的来源，rs2 或者 立即数。
- 定义后续的译码器的输出信号集合，用一个Bundle存储起来。

```scala
import chisel3._

/**
 * 指令集定义（RV32I 子集）
 *
 * 这一层是「数据」：指令表增 / 删 / 改只动 ISA.table，
 * 译码器（Controler）本身不认识任何一条具体指令。
 *
 * 约定：
 *   - op / f3 / f7 是指令编码里参与译码的字段，"" 表示该字段不关心（don't care）；
 *     非空时写成二进制字面量（"b0110011"），Chisel 的字符串字面量必须带进制前缀
 *   - aluOp / immType / memSize / op1Sel / op2Sel 存的是枚举的名字，
 *     由译码器翻译成硬件，这样指令表本身是纯数据，可以脱离硬件做检查和生成文档
 */

/** ALU 运算集合（RV32I 定义） */
object ALUOp extends ChiselEnum {
  val ADD, SUB, SLL, SLT, SLTU, XOR, SRL, SRA, OR, AND = Value
}

/** 立即数格式 */
object ImmType extends ChiselEnum {
  val NONE, I, S, B, U, J = Value
}

/** 访存宽度 */
object MemSize extends ChiselEnum {
  val BYTE, HALF, WORD = Value
}

/** ALU 第 1 操作数来源 */
object Op1Sel extends ChiselEnum {
  val RS1, ZERO = Value
}

/** ALU 第 2 操作数来源 */
object Op2Sel extends ChiselEnum {
  val RS2, IMM = Value
}

/** 译码出的控制信号 */
class Ctrl extends Bundle {
  val aluOp       = ALUOp()          // ALU 做什么
  val immType     = ImmType()        // 立即数格式（决定用哪个 imm）
  val memSize     = MemSize()        // 访存宽度
  val op1Sel      = Op1Sel()         // ALU 第 1 操作数来自 rs1 还是 0
  val op2Sel      = Op2Sel()         // ALU 第 2 操作数来自 rs2 还是立即数
  val regWrite    = Bool()           // 写 rd
  val memRead     = Bool()           // 读内存
  val memWrite    = Bool()           // 写内存
  val memUnsigned = Bool()           // 读内存零扩展（LBU）还是符号扩展（LB）
  val branch      = Bool()           // 条件分支（当前这批指令未使用）
  val jump        = Bool()           // 无条件跳转
  val jalr        = Bool()           // 跳转目标来自寄存器
  val link        = Bool()           // rd ← pc+4
  val illegal     = Bool()           // 非法指令
}
```

下面是addi和jalr的格式与编码：

![image.png](/images/posts/ysyx-e5/image%206.png)

![image.png](/images/posts/ysyx-e5/image%207.png)

![image.png](/images/posts/ysyx-e5/image%2010.png)

![image.png](/images/posts/ysyx-e5/image%2011.png)

这里就直接实现8条指令所需的全部ALU功能了，其根据输入的ALUOp选择输出对应的运算结果。

```scala
import chisel3._
import chisel3.util._

/**
 * 算术逻辑单元
 *
 * 由 ALUOp 决定做什么；两个操作数由外面选好送进来：
 *   op1 = rs1 或 0        （由 ctrl.op1Sel 决定，见 ISA.scala）
 *   op2 = rs2 或 立即数   （由 ctrl.op2Sel 决定）
 *
 * 移位量取 op2 的低位：RV32 取 5 位，RV64 取 6 位。
 * 因为移位量就在 op2 的低位，R 型（SLL rd,rs1,rs2）和 I 型（SLLI rd,rs1,shamt）
 * 可以共用同一套移位逻辑。
 *
 * 注意：Chisel 7 里位段提取（apply）只能作用在 Wire 上，不能直接作用在表达式上，
 *       所以加减和左移的结果都先落成 Wire 再截取。
 */
class ALU(val xlen: Int = 32) extends Module {
  require(xlen > 0, "xlen 必须为正数")

  val io = IO(new Bundle {
    val op1    = Input(UInt(xlen.W))
    val op2    = Input(UInt(xlen.W))
    val op     = Input(ALUOp())
    val result = Output(UInt(xlen.W))
  })
  
  // 移位量宽度：RV32 = 5 bit，RV64 = 6 bit
  val shamtWidth = log2Ceil(xlen)
  val shamt      = io.op2(shamtWidth - 1, 0)

  // 加 / 减：结果位宽 xlen+1，取低 xlen 位（相当于模 2^xlen）
  val addFull = Wire(UInt((xlen + 1).W))
  addFull := io.op1 +& io.op2
  val subFull = Wire(UInt((xlen + 1).W))
  subFull := io.op1 -& io.op2
  val add = addFull(xlen - 1, 0)
  val sub = subFull(xlen - 1, 0)

  // 左移：动态移位的结果位宽是 xlen + (1 << shamtWidth) - 1，取低 xlen 位
  val sllFull = Wire(UInt((xlen + (1 << shamtWidth) - 1).W))
  sllFull := io.op1 << shamt
  val sll = sllFull(xlen - 1, 0)

  val srl = io.op1 >> shamt        // 逻辑右移
  val sra = io.op1.asSInt >> shamt // 算术右移

  // 比较结果是 1 bit，用 Wire 接出来，连接时自动零扩展到 xlen 位
  val slt  = Wire(UInt(xlen.W))
  val sltu = Wire(UInt(xlen.W))
  slt  := (io.op1.asSInt < io.op2.asSInt).asUInt // 有符号 <
  sltu := (io.op1 < io.op2).asUInt                // 无符号 <

  io.result := MuxLookup(io.op, 0.U(xlen.W))(Seq(
    ALUOp.ADD  -> add,
    ALUOp.SUB  -> sub,
    ALUOp.SLL  -> sll,
    ALUOp.SLT  -> slt,
    ALUOp.SLTU -> sltu,
    ALUOp.XOR  -> (io.op1 ^ io.op2),
    ALUOp.SRL  -> srl,
    ALUOp.SRA  -> sra.asUInt,
    ALUOp.OR   -> (io.op1 | io.op2),
    ALUOp.AND  -> (io.op1 & io.op2)
  ))
}

```

### 如何使用Chisel高效实现处理器指令？

> 
> 
> 
> **先说结论**：在 Chisel 里高效实现处理器，核心是把指令当数据表管理，而不是逐条翻译成 `when` 分支。
> 

我们的 Chisel 代码应该主要是一张可扩展的指令描述表 + 一个指令字段切片逻辑 + 一个由表生成的译码器，而不是把每条汇编逐字翻译成 `when` 分支。

1. **译码器表驱动**：用 `BitPat` + `ListLookup` 把"位模式 → 控制信号"写成一张表，加指令 = 加一行数据，不改电路结构。
2. **字段切片复用（我们的ImmGen模块）**：先把 32 位指令统一切成命名信号（`opcode`、`rd`、`rs1`、`immI` 等），译码表只引用这些信号，与数据通路解耦。
3. **控制信号 Bundle 化**：把 `regWrite`、`aluOp`、`memRead` 等打包成 `CtrlBundle`，译码表每行产出一个常量，直接驱动数据通路多路选择。

总结：**表驱动译码 + 字段复用 + 控制信号 Bundle 化**，我们只需要维护数据映射，不是逻辑代码，加指令和改指令集的成本降一个量级。

---

> **核心问题：译码器到底要解决什么问题？**
> 

一条指令中的位可以被分为两类：

- 关心的位：不同指令有着不同关心的位，不过基本就是opcode、funct3和funct7中选
- 不关心的位（don’t-care bits）：just don’t care :)

所以译码器要做的事就是判断：**这条指令的某些位，是否等于某个特定模式？**

下面来看看三种实现处理器指令的思路，体会一下Chisel的强大。

**思路一：手写if/when链**

```scala
when (opcode === "b0110011" && funct3 === "b000") { ctrl.aluOp := ALUOp.ADD }                                                                                                                      
when (opcode === "b0110011" && funct3 === "b001") { ctrl.aluOp := ALUOp.SLL } 
```

- 本质上是把每条指令的匹配条件直接写成 Chisel `when` 分支，综合后是一棵**优先级编码的组合逻辑树**。
- 这种写法的缺点很多：
    - **控制信号分散在各分支内**，指令数与分支数线性耦合；
    - 新增指令需修改多处，删除指令易残留悬空赋值（未覆盖路径的默认值问题）；
    - 控制信号的正确性依赖人工同步，**无单一事实来源（single source of truth）**。

**思路二：表驱动 MuxLookup**

```scala
io.aluOp := MuxLookup(key, ALUOp.ADD)(Seq(                                                                                                                                                         
		"b0110011_000_0000000" -> ALUOp.ADD,                                                                                                                                                             
    "b0110011_001_0000000" -> ALUOp.SLL,                                                                                                                                                             
    ...                                                                                                                                                                                              
)) 
```

- 采用模式匹配，将"模式 → 控制信号"的映射组织成 Seq[(UInt, T)]，由 MuxLookup 生成**多路选择器（mux tree）**。加/删指令对应表的增删，未命中自动落到 default。
- 优点是**增删指令是数据操作而非代码逻辑的修改**，保证**单一事实来源**。
- 缺点：
    - key 是**手工拼接的位串**，字段边界与语义不清晰（魔数）；
    - don't-care 位（就是模式中的下划线 ’_‘）必须显式写成固定值才能拼 key，导致同一 opcode 下不同 funct 组合被拆成多行，表碎片化；
    - 字段不连续时 key 构造易错。

**思路三：Scala DSL 描述指令集 + elaboration 期生成译码器**

> 核心思想：**把"每条指令关心哪些位、等于什么、输出什么"写成一条结构化数据，让程序自动生成译码电路。**
> 

例如下面这段伪代码：

```scala
指令名: ADD
  匹配: opcode=0110011 且 funct3=000 且 funct7=0000000
  输出: aluOp=ADD, regWrite=1, memRead=0, ...

指令名: LUI
  匹配: opcode=0110111
  输出: aluOp=PASS_B, regWrite=1, ...
```

- 为每条指令编写一条结构化的数据
- 仅显式写出指令关心的位，不用管don’t-care位

具体实现思路如下：

```scala
case class InstDef(
  name:    String,          // 指令名，仅用于调试
  pattern: BitPat,          // 匹配模式，? 表示 don't-care
  ctrl:    CtrlBundle       // 匹配成功后输出的控制信号
)

val instTable = Seq(
  InstDef("ADD", "b0110011_000_?????_?????_?????_0000000".U, CtrlAdd),
  InstDef("LUI", "b0110111_?????_?????_?????_?????_???????".U, CtrlLui),
  InstDef("LW",  "b0000011_010_?????_?????_010_???????".U, CtrlLw),
  ...
)
```

- 表本身只是 Scala 中的数据（Seq[InstDef]），不是硬件。
- 这张表在"Chisel电路生成"的阶段被使用，最终变成控制器硬件。
- 生成出来的硬件中不再有这张表，只剩比较器和 Mux。

在ISA.scala中实现指令表：

- case class Insn 定义了对一条指令的描述，包含指令的全部信息
- 最后的object ISA定义了一张table，其中存储了所有指令对应的Insn

```scala
/** 一条指令的描述：纯数据，不含任何硬件对象 */
case class Insn(
  name       : String,
  op         : String,             // 7 bit opcode
  f3         : String = "",        // 3 bit funct3，"" = 不关心
  f7         : String = "",        // 7 bit funct7，"" = 不关心
  aluOp      : String = "ADD",      // ALUOp 的名字
  immType    : String = "NONE",     // ImmType 的名字
  memSize    : String = "WORD",     // MemSize 的名字
  op1Sel     : String = "RS1",      // Op1Sel 的名字
  op2Sel     : String = "RS2",      // Op2Sel 的名字
  regWrite   : Boolean = false,     // 写 rd
  memRead    : Boolean = false,     // 读内存
  memWrite   : Boolean = false,     // 写内存
  memUnsigned: Boolean = false,     // 读内存零扩展
  branch     : Boolean = false,     // 条件分支
  jump       : Boolean = false,     // 无条件跳转
  jalr       : Boolean = false,     // 目标来自寄存器
  link       : Boolean = false      // rd ← pc+4
)

object ISA {

  /** 指令表：增 / 删 / 改指令只动这里
    *
    * 语义说明（ALU 约定：result = op1 + op2，访存地址 = op1 + op2）： ADD rd = rs1 + rs2 ADDI rd = rs1 + imm LUI rd = imm （op1 = 0,
    * op2 = imm） LW rd = M[rs1 + imm] LBU rd = M[rs1 + imm] （零扩展） LB rd = M[rs1 + imm] （符号扩展） LH rd = M[rs1 + imm]
    * （符号扩展） LHU rd = M[rs1 + imm] （零扩展） SW M[rs1 + imm] = rs2（存的数据恒为 rs2，不需要控制信号） SB M[rs1 + imm] = rs2 SH M[rs1 + imm]
    * \= rs2 JALR rd = pc + 4, pc = (rs1 + imm) & ~1 ECALL / EBREAK 通过 DPI-C 通知仿真环境结束仿真（状态不变）
    */
  def table: Seq[Insn] = Seq(
    Insn(
      name = "ADD",
      op = "b0110011",
      f3 = "b000",
      f7 = "b0000000",
      aluOp = "ADD",
      op1Sel = "RS1",
      op2Sel = "RS2",
      regWrite = true
    ),
    Insn(
      name = "ADDI",
      op = "b0010011",
      f3 = "b000",
      aluOp = "ADD",
      immType = "I",
      op1Sel = "RS1",
      op2Sel = "IMM",
      regWrite = true
    ),
    Insn(name = "LUI", op = "b0110111", aluOp = "ADD", immType = "U", op1Sel = "ZERO", op2Sel = "IMM", regWrite = true),
    Insn(
      name = "LW",
      op = "b0000011",
      f3 = "b010",
      aluOp = "ADD",
      immType = "I",
      memSize = "WORD",
      op1Sel = "RS1",
      op2Sel = "IMM",
      memRead = true,
      regWrite = true
    ),
    Insn(
      name = "LBU",
      op = "b0000011",
      f3 = "b100",
      aluOp = "ADD",
      immType = "I",
      memSize = "BYTE",
      op1Sel = "RS1",
      op2Sel = "IMM",
      memRead = true,
      memUnsigned = true,
      regWrite = true
    ),
    // LB：读一个字节，符号扩展（memUnsigned = false）
    Insn(
      name = "LB",
      op = "b0000011",
      f3 = "b000",
      aluOp = "ADD",
      immType = "I",
      memSize = "BYTE",
      op1Sel = "RS1",
      op2Sel = "IMM",
      memRead = true,
      regWrite = true
    ),
    // LH：读一个半字，符号扩展
    Insn(
      name = "LH",
      op = "b0000011",
      f3 = "b001",
      aluOp = "ADD",
      immType = "I",
      memSize = "HALF",
      op1Sel = "RS1",
      op2Sel = "IMM",
      memRead = true,
      regWrite = true
    ),
    // LHU：读一个半字，零扩展
    Insn(
      name = "LHU",
      op = "b0000011",
      f3 = "b101",
      aluOp = "ADD",
      immType = "I",
      memSize = "HALF",
      op1Sel = "RS1",
      op2Sel = "IMM",
      memRead = true,
      memUnsigned = true,
      regWrite = true
    ),
    Insn(
      name = "SW",
      op = "b0100011",
      f3 = "b010",
      aluOp = "ADD",
      immType = "S",
      memSize = "WORD",
      op1Sel = "RS1",
      op2Sel = "IMM",
      memWrite = true
    ),
    Insn(
      name = "SB",
      op = "b0100011",
      f3 = "b000",
      aluOp = "ADD",
      immType = "S",
      memSize = "BYTE",
      op1Sel = "RS1",
      op2Sel = "IMM",
      memWrite = true
    ),
    // SH：写一个半字（低 16 bit）
    Insn(
      name = "SH",
      op = "b0100011",
      f3 = "b001",
      aluOp = "ADD",
      immType = "S",
      memSize = "HALF",
      op1Sel = "RS1",
      op2Sel = "IMM",
      memWrite = true
    ),
    Insn(
      name = "JALR",
      op = "b1100111",
      f3 = "b000",
      aluOp = "ADD",
      immType = "I",
      op1Sel = "RS1",
      op2Sel = "IMM",
      jump = true,
      jalr = true,
      link = true,
      regWrite = true
    ),
    // SYSTEM 指令（opcode 0x73）：ecall / ebreak。
    // 它们本身不改变任何状态（不写寄存器、不访存、不跳转），只是通过 DPI-C
    // 通知仿真环境结束仿真。
    // opcode + funct3 + funct7 三者都一样，ecall(imm=0) 和 ebreak(imm=1)
    // 只能靠 imm12 区分，所以这两行必须写 imm12。
    // 目前没有 trap 处理，ecall 和 ebreak 都当成「停机」；以后要区分语义
    // （比如 ecall 跳到 trap handler）时，改这两行就行，译码器不用动。
    Insn(
      name = "ECALL",
      op = "b1110011",
      f3 = "b000",
      f7 = "b0000000",
      imm12 = "b000000000000",
      halt = true
    ),
    Insn(
      name = "EBREAK",
      op = "b1110011",
      f3 = "b000",
      f7 = "b0000000",
      imm12 = "b00000000001",
      halt = true
    )
  )

  /** 两条指令的匹配模式是否可能同时命中（true = 有冲突）
    *
    * 同一个字段上，两个模式只要有一个是「不关心」，就可能同时命中； 只有在某个字段上两个模式都给了值且不同，才互斥。
    */
  def overlaps(a: Insn, b: Insn): Boolean = {
    def compatible(x: String, y: String): Boolean = x.isEmpty || y.isEmpty || x == y
    compatible(a.op, b.op) && compatible(a.f3, b.f3) && compatible(a.f7, b.f7) && compatible(a.imm12, b.imm12)
  }
}
```

> 总结：这张instTable 表是 **elaboration 期被执行的 Scala 数据**，生成器在运行 Scala 程序的过程中遍历它，把每一行**翻译成 Chisel 硬件节点**（比较器、Mux），最终由 FIRRTL 编译成 Verilog 电路。
> 

### 控制器的设计

前面已经介绍过了控制器（译码器）的功能就是对输入的指令进行解析，并输出相应的控制信号。

根据上节表驱动的思路，该模块执行如下思路：

- 首先能够直接从指令中获取的控制信息先进行处理
- 检查指令的匹配模式是否重叠，如果发现重叠就报错
- 最核心的语句：MuxCase(dflt, table.map(t => matches(t) -> ctrlOf(t)))
    - 该函数的签名为：MuxCase(default: T, cases: Seq[(Bool, T)]): T
    - MuxCase会遍历cases中的每个 (条件, 值)，按顺序找到第一个条件为真的项作为输出，如果所有case都不为真则返回default
    - 所以这条语句会先对table中的每个指令模式执行matches()函数，如果其返回true就将该依据该指令构造好的控制xBundle存入新数组。所以最后MuxCase要么返回匹配成功的控制信号，要么返回默认控制信号。

```scala
import chisel3._
import chisel3.util._

/**
 * 指令译码器（表驱动）
 *
 * 译码逻辑完全由 ISA.table 生成，本模块不认识任何一条具体指令：
 *   - 加一条指令  → 往 ISA.table 加一行
 *   - 删一条指令  → 从 ISA.table 删一行（自动落到「非法指令」）
 *   - 改一条指令  → 改那一行
 *
 * 译码结果：
 *   io.rd / io.rs1 / io.rs2  指令里的三个寄存器号
 *   io.ctrl                   控制信号（见 Ctrl）
 */
class Controler extends Module {
  val io = IO(new Bundle {
    val inst = Input(UInt(32.W))
		
    val rd  = Output(UInt(5.W)) // 目的寄存器
    val rs1 = Output(UInt(5.W)) // 源寄存器 1
    val rs2 = Output(UInt(5.W)) // 源寄存器 2

    val ctrl = Output(new Ctrl) // 一组控制信号
  })
	
  val inst = io.inst
	
	// 从指令中取出所需的字段
  val opcode = inst(6, 0)
  val funct3 = inst(14, 12)
  val funct7 = inst(31, 25)
	
  io.rd  := inst(11, 7)
  io.rs1 := inst(19, 15)
  io.rs2 := inst(24, 20)
	
  // ---------------- 指令表合法性检查 ----------------
  // 两条指令的匹配模式不能重叠，否则同一条指令可能被译成两条里靠前的那条。
  // 这个检查在 elaboration 期做，改指令表时冲突会立刻暴露，而不是等到仿真跑歪。
  // zipWithIndex用于为数组添加下表
  val table = ISA.table 
  for ((a, i) <- table.zipWithIndex; 
			 (b, j) <- table.zipWithIndex if i < j) {
		// 如果两条指令的匹配模式重叠，就是输出错误信息
    require(!ISA.overlaps(a, b), s"指令模式冲突：${a.name} 与 ${b.name} 的匹配模式可能同时命中")
  }

  // ---------------- 检查指令是否匹配的函数 ----------------
  // f3 / f7 为空串表示该字段不关心（用 Scala 的 if 在展开期决定，不生成多余比较器）
  def matches(t: Insn): Bool = {
    val f3Match: Bool = if (t.f3.isEmpty) true.B else funct3 === t.f3.U(3.W)
    val f7Match: Bool = if (t.f7.isEmpty) true.B else funct7 === t.f7.U(7.W)
    
    // opcode、funct3和funct5与指令模板均相同，才表示匹配成功
    (opcode === t.op.U(7.W)) && f3Match && f7Match
  }
	
  // ---------------- 由描述生成控制信号 ----------------
  def ctrlOf(t: Insn): Ctrl = {
    val c = Wire(new Ctrl)
    c.aluOp       := ALUOp(t.aluOp)
    c.immType     := ImmType(t.immType)
    c.memSize     := MemSize(t.memSize)
    c.op1Sel      := Op1Sel(t.op1Sel)
    c.op2Sel      := Op2Sel(t.op2Sel)
    c.regWrite    := t.regWrite.B
    c.memRead     := t.memRead.B
    c.memWrite    := t.memWrite.B
    c.memUnsigned := t.memUnsigned.B
    c.branch      := t.branch.B
    c.jump        := t.jump.B
    c.jalr        := t.jalr.B
    c.link        := t.link.B
    c.illegal     := false.B
    c
  }

  // ---------------- 默认：非法指令 ----------------
  // 所有控制信号无效（不写寄存器、不访存、不跳转），只置 illegal
  val dflt = Wire(new Ctrl)
  dflt.aluOp       := ALUOp.ADD
  dflt.immType     := ImmType.NONE
  dflt.memSize     := MemSize.WORD
  dflt.op1Sel      := Op1Sel.RS1
  dflt.op2Sel      := Op2Sel.RS2
  dflt.regWrite    := false.B
  dflt.memRead     := false.B
  dflt.memWrite    := false.B
  dflt.memUnsigned := false.B
  dflt.branch      := false.B
  dflt.jump        := false.B
  dflt.jalr        := false.B
  dflt.link        := false.B
  dflt.illegal     := true.B

  // MuxCase 按顺序取第一个命中的分支；本表内模式互不重叠，顺序无关
  io.ctrl := MuxCase(dflt, table.map(t => matches(t) -> ctrlOf(t)))
}

```

### 使用Verilator进行仿真

为了避免在处理器中实现自己的内存，这里模仿minirvEMU中的内存模型（字节数组M），编写一个函数 pmem_read 来根据PC的值获取内存数据，并通过 DPI-C 接口访问。

这里先实现一个模拟的内存 SimMem.sv，其通过 DPI-C 接口 mem_read 和 mem_write 访问主程序中定义的内存数组。

```verilog
// 存储器黑盒：真正的内存实现在 C 主程序里，RTL 通过 DPI-C 调用
//
//   mem_read (addr, len)          读 len 个字节（小端），返回值零扩展
//   mem_write(addr, data, len)    把 data 的低 len 个字节写到 addr
//
// 长度 len：1 = byte，2 = half，4 = word。
// 写发生在时钟沿；读是组合的（DPI 导入函数在同一个时间步内返回）。
import "DPI-C" function int unsigned mem_read(input int unsigned addr, input int unsigned len);
import "DPI-C" function void mem_write(input int unsigned addr, input int unsigned data, input int unsigned len);

module SimMem(
  input         clock,
  input  [31:0] addr,
  input  [31:0] wdata,
  input         we,
  input  [1:0]  size,        // 0 = byte, 1 = half, 2 = word
  input         zeroExtend,  // 1 = 零扩展, 0 = 符号扩展
  output [31:0] rdata
);
	 
  // len 要能放下 4，宽度和 DPI 函数的参数一致（32 bit）
  wire [31:0] len = (size == 2'd2) ? 32'd4 : (size == 2'd1 ? 32'd2 : 32'd1);

  // 组合读
  wire [31:0] raw = mem_read(addr, len);
  assign rdata = zeroExtend ? raw
                : (size == 2'd0 ? {{24{raw[7]}},  raw[7:0]}
                : (size == 2'd1 ? {{16{raw[15]}}, raw[15:0]}
                : raw));

  // 写：时钟沿触发
  always @(posedge clock) begin
    if (we) mem_write(addr, wdata, len);
  end

endmodule
```

使用Chisel模块对该RTL程序进行封装：

```scala
import chisel3._
import chisel3.util._

/** 存储器黑盒
  *
  * 真正的内存不在处理器里，而是实现在 C 主程序中（见 tb/sim_mem.cpp）， RTL 通过 DPI-C 调用 mem_read / mem_write 访问它，和 minirvEMU 的做法一致。
  *
  * Verilog 实现在 src/main/resources/SimMem.sv，展开期读进来 （Chisel 7 的 HasBlackBoxInline 需要传源码内容）。
  *
  * 说明：BlackBox 不是 Module，没有隐式时钟，所以时钟是显式端口； 端口名就是 io 里的字段名（不带 io_ 前缀）。
  */
class SimMem extends BlackBox with HasBlackBoxInline {
  val io = IO(new Bundle {
    val clock      = Input(Clock())
    val addr       = Input(UInt(32.W))  // 字节地址
    val wdata      = Input(UInt(32.W))  // 写数据
    val we         = Input(Bool())      // 写使能
    val size       = Input(UInt(2.W))   // 访问宽度：0 = byte, 1 = half, 2 = word
    val zeroExtend = Input(Bool())      // 1 = 零扩展, 0 = 符号扩展
    val rdata      = Output(UInt(32.W)) // 读出数据
  })
  
  private val stream = getClass.getResourceAsStream("/SimMem.sv")
  require(stream != null, "找不到 SimMem.sv（应放在 src/main/resources/ 下）")
  setInline("SimMem", scala.io.Source.fromInputStream(stream).mkString)
}
```

最后实现顶层模块 Top，将前面实现的各部件连接起来：

```scala
import chisel3._
import chisel3.util._

/** 顶层模块：单周期 RV32I CPU
  * 取指 → 译码 → 读寄存器 → 立即数 / ALU → 访存 → 写回 → 更新 PC
  * 存储器不在处理器里：内存实现在 C 主程序中（tb/sim_mem.cpp）， RTL 通过 DPI-C 访问，取指和数据访问共用同一块内存（统一存储）。
  * 指令集见 ISA.scala，目前实现 8 条： ADD ADDI LUI LW LBU SW SB JALR
  */
class top extends Module {
  val io = IO(new Bundle {
    val pc    = Output(UInt(32.W))          // 当前 PC
    val instr = Output(UInt(32.W))          // 当前指令
    val regs  = Output(Vec(32, UInt(32.W))) // 寄存器堆快照
  })

  val xlen = 32

  // ---------------- 取指 ----------------
  val pc = Module(new PC(xlen = xlen))
	
  // 指令存储器（C 侧内存，取指按字访问）
  val imem = Module(new SimMem)
  imem.io.clock      := clock
  imem.io.addr       := pc.io.pc
  imem.io.wdata      := 0.U
  imem.io.we         := false.B
  imem.io.size       := 2.U // word
  imem.io.zeroExtend := true.B
  val instr = imem.io.rdata
	
  // ---------------- 译码 ----------------
  val ctrl = Module(new Controler)
  ctrl.io.inst := instr

  // ---------------- 寄存器堆 ----------------
  val rf = Module(new RegFile(xlen = xlen))
  rf.io.rs1 := ctrl.io.rs1
  rf.io.rs2 := ctrl.io.rs2
  rf.io.rd  := ctrl.io.rd

  // ---------------- 立即数 ----------------
  val immGen = Module(new ImmGen(xlen = xlen))
  immGen.io.inst    := instr
  immGen.io.immType := ctrl.io.ctrl.immType
  val imm = immGen.io.imm
	
  // ---------------- ALU ----------------
  // 操作数由控制信号选：op1 = rs1 或 0，op2 = rs2 或 立即数
  val alu = Module(new ALU(xlen = xlen))
  alu.io.op1 := Mux(ctrl.io.ctrl.op1Sel === Op1Sel.ZERO, 0.U(xlen.W), rf.io.out1)
  alu.io.op2 := Mux(ctrl.io.ctrl.op2Sel === Op2Sel.IMM, imm, rf.io.out2)
  alu.io.op  := ctrl.io.ctrl.aluOp

  // ---------------- 数据存储 ----------------
  // 和取指共用 C 侧那块内存：地址 = ALU 结果（rs1 + imm，字节地址），写数据恒为 rs2
  val dmem = Module(new SimMem)
  dmem.io.clock      := clock
  dmem.io.addr       := alu.io.result
  dmem.io.wdata      := rf.io.out2
  dmem.io.we         := ctrl.io.ctrl.memWrite
  dmem.io.size       := ctrl.io.ctrl.memSize.asUInt
  dmem.io.zeroExtend := ctrl.io.ctrl.memUnsigned
	
  // ---------------- 写回 ----------------
  // 访存指令写回内存数据，其余写回 ALU 结果；
  // 跳转类指令（JAL/JALR）写回 pc+4（link）
  val wbData = Mux(ctrl.io.ctrl.memRead, dmem.io.rdata, alu.io.result)
  rf.io.data := Mux(ctrl.io.ctrl.link, pc.io.pc + 4.U(xlen.W), wbData)
  rf.io.we   := ctrl.io.ctrl.regWrite
	
  // ---------------- 更新 PC ----------------
  // 跳转：JALR 的目标是 (rs1 + imm) & ~1，alu.io.result 就是 rs1 + imm
  val jumpTarget = alu.io.result & (~1.U(xlen.W))
  pc.io.next := Mux(ctrl.io.ctrl.jump, jumpTarget, pc.io.pc + 4.U(xlen.W))
	
  // ---------------- 调试输出 ----------------
  io.pc    := pc.io.pc
  io.instr := instr
  io.regs  := rf.io.regs
}
```

我们需要使用C++实现DPI-C接口，头文件如下：

```cpp
// sim_mem.h
#pragma once

#include <cstdint>

// C 侧存储器：RTL 通过 DPI-C 调用下面两个函数访问它。
//
// 签名必须和 Verilog 里的声明完全一致：
//   import "DPI-C" function int unsigned mem_read(input int unsigned addr, input int unsigned len);
//   import "DPI-C" function void mem_write(input int unsigned addr, input int unsigned data, input int unsigned len);
//
// 长度 len：1 = byte，2 = half，4 = word。小端。

#define MEM_SIZE (16 * 1024 * 1024) // 16 MB

extern "C" unsigned int mem_read(unsigned int addr, unsigned int len);
extern "C" void mem_write(unsigned int addr, unsigned int data, unsigned int len);

// 把程序镜像（每行一条 32 bit 指令的十六进制文本）装进内存
void mem_load_image(const char *path);

// 内存基址（仿真主程序想直接查看内存时用）
uint8_t *mem_base();

```

实现头文件中的这几个接口函数：

```cpp
// C 主程序侧的存储器：RTL 通过 DPI-C 调用 mem_read / mem_write 访问
//
// 内存放在这里而不是处理器里，和 minirvEMU 的做法一致：
//   - 程序镜像在仿真开始前加载进 pmem
//   - RTL 侧取指和数据访问都通过 DPI 走同一块内存（统一存储）
//
// 编译：被 verilator --cc --exe 一起链接进来；不要在这里定义 main()。
#include "sim_mem.h"

#include <cstdio>
#include <cstdlib>
#include <cstring>

#define MEM_MASK (MEM_SIZE - 1)

static uint8_t pmem[MEM_SIZE];

// ---------------- DPI-C 导出函数（RTL 侧 import "DPI-C" 声明）----------------

// 读 len 个字节（小端），返回值零扩展
extern "C" unsigned int mem_read(unsigned int addr, unsigned int len) {
  unsigned int v = 0;
  for (unsigned i = 0; i < len && i < 8; i++) {
    v |= (unsigned int)pmem[(addr + i) & MEM_MASK] << (8 * i);
  }
  return v;
}

// 把 data 的低 len 个字节写到 addr（小端）
extern "C" void mem_write(unsigned int addr, unsigned int data, unsigned int len) {
  for (unsigned i = 0; i < len && i < 8; i++) {
    pmem[(addr + i) & MEM_MASK] = (uint8_t)(data >> (8 * i));
  }
}

// ---------------- 程序镜像加载 ----------------

// 解析镜像文件：每行一条 32 bit 指令（十六进制），"@地址" 定位（字节地址），
// "//" 或 "#" 之后是注释。
void mem_load_image(const char *path) {
  FILE *f = fopen(path, "r");
  if (f == NULL) {
    fprintf(stderr, "[sim] 打不开程序镜像：%s\n", path);
    return;
  }
  char line[256];
  unsigned long addr = 0;
  unsigned count = 0;
  while (fgets(line, sizeof(line), f) != NULL) {
    char *p = line;
    char *cut = strpbrk(p, "//#");
    if (cut != NULL) *cut = '\0';
    while (*p == ' ' || *p == '\t') p++;
    char *end = p + strlen(p);
    while (end > p && (end[-1] == '\n' || end[-1] == '\r' || end[-1] == ' ' || end[-1] == '\t')) {
      *--end = '\0';
    }
    if (*p == '\0') continue;

    if (*p == '@') {
      addr = strtoul(p + 1, NULL, 16);
      continue;
    }
    uint32_t inst = (uint32_t)strtoul(p, NULL, 16);
    // 小端：低字节在前
    for (int i = 0; i < 4; i++) {
      pmem[(addr + i) & MEM_MASK] = (uint8_t)(inst >> (8 * i));
    }
    addr += 4;
    count++;
  }
  fclose(f);
  printf("[sim] 已加载程序镜像 %s：%u 条指令\n", path, count);
}

uint8_t *mem_base() { return pmem; }

```

下面重新编写主程序，通过 load_program() 从 ebreak.hex 中加载指令到内存M。在main函数中不断根据电路中PC所指向的地址，从内存中读取指令，然后通过single_cycle() 模拟一个时钟周期。

如果遇到 ebreak 指令就输出停止信息并break出来，最后输出GPR中的32个寄存器的值（通过verilator生成的DUT对象可以获取子模块端口的值）。

```cpp
// 仿真主程序：驱动 DUT 的时钟、跑程序、核对结果
//
// 用法：
//   build/top [prog.hex] [--cycles N] [--trace]
//
//   prog.hex   程序镜像，默认 sim/progs/prog.hex（相对可执行文件位置推导）
//   --cycles N 最多跑 N 个周期（默认 32）
//   --trace    逐周期打印 PC / 指令
//
// 程序跑完后，如果同名 .expect 文件存在，就按它核对寄存器；
// 例如 sim/progs/prog.hex 配 sim/progs/prog.expect：
//     x1 0x00000005
//     x3 0x0000000c
//
// 内存实现在 sim_mem.cpp（DPI-C），RTL 侧通过 import "DPI-C" 调用。
#include "Vtop.h"
#include "verilated.h"
#include "sim_mem.h"

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <unistd.h>
#include <vector>

// EBREAK 的机器码：主程序靠它判断"执行到 ebreak 了"
#define EBREAK_INSTR 0x00100073u

// ---------------------------------------------------------------------------
// DUT
// ---------------------------------------------------------------------------

static Vtop dut;

// 一个时钟周期：低半拍 -> 上升沿 -> 高半拍
static void dut_single_cycle() {
  dut.clock = 0;
  dut.eval();
  dut.clock = 1;
  dut.eval();
}

static void dut_reset(int n) {
  dut.reset = 1;
  while (n-- > 0) dut_single_cycle();
  dut.reset = 0;
}

// 读寄存器堆（顶层把 32 个寄存器直接引出来了）
static unsigned int dut_get_reg(int i) {
  switch (i) {
#define REG_CASE(n) case n: return dut.io_regs_##n;
    REG_CASE(0)  REG_CASE(1)  REG_CASE(2)  REG_CASE(3)
    REG_CASE(4)  REG_CASE(5)  REG_CASE(6)  REG_CASE(7)
    REG_CASE(8)  REG_CASE(9)  REG_CASE(10) REG_CASE(11)
    REG_CASE(12) REG_CASE(13) REG_CASE(14) REG_CASE(15)
    REG_CASE(16) REG_CASE(17) REG_CASE(18) REG_CASE(19)
    REG_CASE(20) REG_CASE(21) REG_CASE(22) REG_CASE(23)
    REG_CASE(24) REG_CASE(25) REG_CASE(26) REG_CASE(27)
    REG_CASE(28) REG_CASE(29) REG_CASE(30) REG_CASE(31)
#undef REG_CASE
    default: return 0;
  }
}

// 默认程序路径：从可执行文件位置推导 <npc>/build/top -> <npc>/sim/progs/prog.hex
static std::string default_prog_path() {
  char buf[4096];
  ssize_t n = readlink("/proc/self/exe", buf, sizeof(buf) - 1);
  if (n > 0) {
    buf[n] = '\0';
    std::string exe(buf);
    size_t slash = exe.find_last_of('/');
    if (slash != std::string::npos) {
      return exe.substr(0, slash) + "/../sim/progs/ebreak.hex";
    }
  }
  return "sim/progs/ebreak.hex";
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

static void usage(const char *prog) {
  fprintf(stderr,
          "Usage: %s [prog.hex] [options]\n"
          "  --cycles N   最多跑 N 个周期（默认 32）\n"
          "  --trace      逐周期打印 PC / 指令\n",
          prog);
}

int main(int argc, char **argv) {
  Verilated::commandArgs(argc, argv);

  std::string prog_path = default_prog_path();
  uint64_t max_cycles = 32;
  bool trace = false;
  
  for (int i = 1; i < argc; i++) {
    std::string opt = argv[i];
    if (opt == "--cycles" && i + 1 < argc) {
      max_cycles = strtoull(argv[++i], nullptr, 10);
    } else if (opt == "--trace") {
      trace = true;
    } else if (opt[0] != '-') {
      prog_path = opt; // 第一个非选项参数 = 程序文件
    } else {
      usage(argv[0]);
      return -1;
    }
  }
	
  // 程序装进 C 侧内存（RTL 取指和数据访问都走这块内存）
  mem_load_image(prog_path.c_str());

  dut_reset(2);

  // -------------------------------------------------------------------------
  // 主循环：每个周期执行一条指令
  // -------------------------------------------------------------------------
  uint64_t cycle = 0;
  while (max_cycles == 0 || cycle < max_cycles) {
    // 命中 ebreak 就停（ebreak 本身不改变状态，停在这里时 PC 就是它的地址）
    if (dut.io_instr == EBREAK_INSTR) {
      printf("NPC: hit EBREAK at PC = 0x%x, a0 = 0x%x\n", dut.io_pc, dut.io_regs_10);
      break;
    }

    uint32_t pc = dut.io_pc;
    uint32_t instr = dut.io_instr;

    dut_single_cycle();
    cycle++;

    if (trace) {
      printf("[%3llu] pc=%08x instr=%08x -> pc=%08x\n",
             (unsigned long long)cycle, pc, instr, dut.io_pc);
    }
  }

  printf("=== 结束状态（%llu 周期）===\n", (unsigned long long)cycle);
  for (int i = 0; i < 32; i++) {
    printf("  x%-2d = 0x%08x\n", i, dut_get_reg(i));
  }

  dut.final();
  return 0;
}
```

编写Makefile：

```makefile
TOPNAME = top

BUILD_DIR  = ./build
OBJ_DIR    = $(BUILD_DIR)/obj_dir
BIN        = $(abspath $(BUILD_DIR)/$(TOPNAME))

CHISEL_DIR = ./chisel
CHISEL_OUT = $(BUILD_DIR)/chisel
SIM_DIR    = ./sim

VERILATOR = verilator
VERILATOR_CFLAGS += -MMD --build -cc \
                    -O3 --x-assign fast --x-initial fast --noassert

# Chisel 源文件（RTL 的唯一真相）
CHISEL_SRCS = $(shell find $(CHISEL_DIR)/src/main/scala -name "*.scala")

# C++ 源文件：仿真主程序 + C 侧内存（DPI-C）
CSRCS = $(SIM_DIR)/sim_main.cpp $(SIM_DIR)/sim_mem.cpp

# Chisel 生成的 SystemVerilog（含黑盒的 inline Verilog）
VSRCS = $(wildcard $(CHISEL_OUT)/*.sv)

$(shell mkdir -p $(BUILD_DIR))

# ---------------------------------------------------------------------------
# 1. Chisel 生成 SystemVerilog
# ---------------------------------------------------------------------------
chisel-generate: $(CHISEL_OUT)/top.sv

$(CHISEL_OUT)/top.sv: $(CHISEL_SRCS) \
                      $(CHISEL_DIR)/src/main/resources/SimMem.sv \
                      $(CHISEL_DIR)/build.sbt \
                      $(CHISEL_DIR)/project/build.properties
	mkdir -p $(CHISEL_OUT)
	cd $(CHISEL_DIR) && sbt -batch run
	test -f $(CHISEL_OUT)/top.sv

# ---------------------------------------------------------------------------
# 2. 编译仿真程序
# ---------------------------------------------------------------------------
$(BIN): chisel-generate $(CSRCS)
	@rm -rf $(OBJ_DIR)
	$(VERILATOR) $(VERILATOR_CFLAGS) \
		--top-module $(TOPNAME) $(VSRCS) $(CSRCS) \
		--Mdir $(OBJ_DIR) --exe -o $(BIN)

# ---------------------------------------------------------------------------
# 3. 跑仿真
# ---------------------------------------------------------------------------
default: $(BIN)

sim: $(BIN)
	$(BIN)

test: sim

# 逐周期打印 PC / 指令，看程序怎么跑
trace: $(BIN)
	$(BIN) --trace

# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# 代码格式（用项目根目录的 .scalafmt.conf）
# ---------------------------------------------------------------------------
format:
	cd $(CHISEL_DIR) && sbt -batch scalafmtAll

checkformat:
	cd $(CHISEL_DIR) && sbt -batch scalafmtCheckAll

# ---------------------------------------------------------------------------
# 杂项
# ---------------------------------------------------------------------------
lint: chisel-generate
	$(VERILATOR) --lint-only -Wall \
		-Wno-UNUSEDSIGNAL \
		--top-module $(TOPNAME) \
		$(VSRCS)

clean:
	rm -rf $(BUILD_DIR)

.PHONY: default all clean lint test sim trace format checkformat chisel-generate
```

我们要测试的程序 ebreak.hex：

```makefile
// ebreak 测试程序：跑几条 jalr/addi，最后由 ebreak 停下
// @0
01400513        // 0  : addi x10, x0, 20      -> a0 = 20
010000e7        // 4  : jalr x1, 16(x0)       -> x1 = 8,  PC = 16
00c000e7        // 8  : jalr x1, 12(x1)       -> x1 = 12, PC = 20
00100073        // 12 : ebreak                -> 主程序在这里停
00a50513        // 16 : addi x10, x10, 10     -> a0 = 30
00008067        // 20 : jalr x0, 0(x1)        -> PC = x1（返回）
```

这个程序的作用是调用若干addi指令和jalr指令，最终将a0寄存器（x10）的值置为30，并跳转到ebreak指令退出执行。

测试一下：

```bash
xi@tanxi:~/ysyx/ysyx-project/npc$ make sim
- V e r i l a t i o n   R e p o r t: Verilator 5.052 2026-09-05 rev v5.052
- Verilator: Built from 0.152 MB sources in 9 modules, into 0.103 MB in 8 C++ files needing 0.000 MB
- Verilator: Walltime 0.810 s (elab=0.002, cvt=0.011, bld=0.793); cpu 0.017 s on 1 threads; allocated 20.289 MB
/home/xi/ysyx/ysyx-project/npc/build/top
[sim] 已加载程序镜像 /home/xi/ysyx/ysyx-project/npc/build/../sim/progs/ebreak.hex：6 条指令
NPC: hit EBREAK at PC = 0xc, a0 = 0x1e
=== 结束状态（5 周期）===
  x0  = 0x00000000
  x1  = 0x0000000c
  x2  = 0x00000000
  x3  = 0x00000000
  x4  = 0x00000000
  x5  = 0x00000000
  x6  = 0x00000000
  x7  = 0x00000000
  x8  = 0x00000000
  x9  = 0x00000000
  x10 = 0x0000001e
  x11 = 0x00000000
  x12 = 0x00000000
  x13 = 0x00000000
  x14 = 0x00000000
  x15 = 0x00000000
  x16 = 0x00000000
  x17 = 0x00000000
  x18 = 0x00000000
  x19 = 0x00000000
  x20 = 0x00000000
  x21 = 0x00000000
  x22 = 0x00000000
  x23 = 0x00000000
  x24 = 0x00000000
  x25 = 0x00000000
  x26 = 0x00000000
  x27 = 0x00000000
  x28 = 0x00000000
  x29 = 0x00000000
  x30 = 0x00000000
  x31 = 0x00000000
```

可以看到程序执行到PC=0xc这条指令时通过ebreak退出，并且退出时a0的值为0x1e，即30。

# **四、让程序决定仿真何时结束**

![image.png](/images/posts/ysyx-e5/image%2032.png)

因为在当前的实现中，程序指令来自于仿真程序中的**全局字节数组M**，前面我们可以直接在仿真程序中判断取出的指令是否为ebreak，来终止处理器的执行。

现在要改用Verilator提供的**DPI-C机制**，使得NPC处理器在执行到ebreak指令时能够调用特定的C函数，终止指令的执行。

> **DPI-C（Direct Programming Interface）是 SystemVerilog 与 C/C++ 代码之间的标准接口，允许两者双向调用。Verilator 对 DPI 的支持主要分为导入和导出两个方向。**
> 
- **DPI 导入：SystemVerilog 调用 C 函数，让 RTL 代码能调用外部 C/C++ 函数**
    - 在 SystemVerilog 中声明 import "DPI-C"，然后实现对应的 C 函数
- **DPI 导出：C 代码调用 SystemVerilog 任务/函数**
    - 使用 export "DPI-C" 将 Verilog 的 task 或 function 暴露给 C
    - 生成的 C 原型为 extern void publicSetBool(svBit in_bool);，你可以在 C 代码中直接调用

---

首先在vsrc/目录下创建ebreak_det.sv ：可以看到其中导入了一个DPI-C函数ebreak_notify，只有当执行到ebreak指令时立刻调用该函数。

```verilog
// ebreak 通知模块：NPC 执行 ebreak 时，通过 DPI-C 通知仿真环境结束仿真
//
//   np_halt(pc, a0)   RTL 通知 C 主程序「程序执行到 ebreak 了，请收尾」
//
// 触发条件：译码器把当前指令认成 ebreak 时给出 trigger=1，
// 在下一个时钟上升沿调用一次 DPI-C 函数。
// 一条 ebreak 只对应一个上升沿（PC 随之前进），所以每条 ebreak 只通知一次。
//
// 好处：仿真环境不需要知道 ebreak 的机器码是什么，也不需要监视指令，
//       它只管一直跑，收到 np_halt 的通知就收尾。
import "DPI-C" function void np_halt(input int unsigned pc, input int unsigned a0);

module Halt(
  input         clock,
  input         trigger,  // 1 = 当前指令是 ebreak
  input  [31:0] pc,       // ebreak 的地址
  input  [31:0] a0        // 顺便带上 a0，方便打印现场
);
  always @(posedge clock) begin
    if (trigger) np_halt(pc, a0);
  end
	
endmodule

```

在 ISA.scala 的 ISA.table 中添加EBREAK的匹配模式：

```scala
		Insn(
      name = "EBREAK",
      op = "b1110011",
      f3 = "b000",
      f7 = "b0000000",
      imm12 = "b00000000001",
      halt = true
    )
```

实现Chisel端Halt模块：

```scala
import chisel3._
import chisel3.util._

/** ebreak 通知模块（黑盒）
  * NPC 执行 ebreak 时，通过 DPI-C 调用 C 侧的 np_halt(pc, a0) 通知仿真环境结束仿真。 仿真环境因此不需要认识 ebreak 的机器码，也不需要监视指令流， 它只管一直跑，收到通知就收尾。
  * Verilog 实现在 src/main/resources/Halt.sv，展开期读进来 （Chisel 7 的 HasBlackBoxInline 需要传源码内容）。
  * 说明：BlackBox 不是 Module，没有隐式时钟，所以时钟是显式端口； 端口名就是 io 里的字段名（不带 io_ 前缀）。
  */
class Halt extends BlackBox with HasBlackBoxInline {
  val io = IO(new Bundle {
    val clock   = Input(Clock())
    val trigger = Input(Bool())     // 1 = 当前指令是 ebreak
    val pc      = Input(UInt(32.W)) // ebreak 的地址
    val a0      = Input(UInt(32.W)) // 顺便带上 a0，方便打印现场
  })
	
  private val stream = getClass.getResourceAsStream("/Halt.sv")
  require(stream != null, "找不到 Halt.sv（应放在 src/main/resources/ 下）")
  setInline("Halt", scala.io.Source.fromInputStream(stream).mkString)
}
```

在Top模块中实例化Halt模块：

```scala
  // ---------------- ebreak：通知仿真环境结束 ----------------
  // 译码器认出 ebreak 时给出 halt=1，这里通过 DPI-C 通知 C 侧的主程序，
  // 仿真环境收到通知就收尾，自己不需要知道 ebreak 的机器码。
  val halt = Module(new Halt)
  halt.io.clock   := clock
  halt.io.trigger := ctrl.io.ctrl.halt
  halt.io.pc      := pc.io.pc
  halt.io.a0      := rf.io.regs(10)
```

此外还需要在译码控制信号中添加是否halt，并修改Controler模块，添加对halt的支持，这一步非常简单，就不展示出来了。

在仿真端实现halt()函数：

```cpp
// ebreak 的通知端：RTL 执行 ebreak 时通过 DPI-C 调进来
//
// 这里是「通知」，不是「收尾」：np_halt 只记下 halt 标志并打印现场，
// 真正的收尾（打印终态、核对期望值、退出）由仿真主程序看到 np_halted() 后完成。
// 所以仿真环境不需要知道 ebreak 的机器码是什么，也不需要监视指令流。
#include "sim_halt.h"

#include <cstdio>

static bool g_halted = false;

// RTL 侧 import "DPI-C" 声明的函数：NPC 执行 ebreak 时在那个时钟上升沿调进来
extern "C" void np_halt(unsigned int pc, unsigned int a0) {
  if (g_halted) return; // 幂等：重复调用只算一次
  g_halted = true;
  printf("NPC: hit EBREAK at PC = 0x%x, a0 = 0x%x\n", pc, a0);
  fflush(stdout);
}

bool np_halted() { return g_halted; }

```

在main.c中添加该函数的实现：

```cpp
// DPI-C 回调: RTL 检测到 ebreak 时主动调用, 通知仿真环境结束
static bool ebreak_hit = false;
extern "C" void ebreak_notify(int pc) {
    printf("NPC: EBREAK notified by DPI-C at PC = 0x%x\n", pc);
    ebreak_hit = true;
}
```

并修改主程序的指令循环中添加对ebreak的支持，调用函数np_halted()，检查是否执行到了ebreak指令，如果是则停止程序的执行：

```c
  // -------------------------------------------------------------------------
  // 主循环：每个周期执行一条指令，一直跑到 RTL 通知「执行到 ebreak 了」
  // -------------------------------------------------------------------------
  uint64_t cycle = 0;
  while (max_cycles == 0 || cycle < max_cycles) {
    uint32_t pc = dut.io_pc;
    uint32_t instr = dut.io_instr;

    dut_single_cycle();
    cycle++;
		
    if (trace) {
      printf("[%3llu] pc=%08x instr=%08x -> pc=%08x\n",
             (unsigned long long)cycle, pc, instr, dut.io_pc);
    }
		
    // RTL 通过 DPI-C 通知过：程序执行到 ebreak 了，收尾
    if (np_halted()) break;
  }
```

测试一下：

```bash
xi@tanxi:~/ysyx/ysyx-project/npc$ make sim
cd ./build && ./top
NPC: EBREAK notified by DPI-C at PC = 0xc
---- GPR dump ----
x0  = 0x00000000
x1  = 0x0000000c
x2  = 0x00000000
x3  = 0x00000000
x4  = 0x00000000
x5  = 0x00000000
x6  = 0x00000000
x7  = 0x00000000
x8  = 0x00000000
x9  = 0x00000000
x10 = 0x0000001e
****x11 = 0x00000000
x12 = 0x00000000
x13 = 0x00000000
x14 = 0x00000000
x15 = 0x00000000
x16 = 0x00000000
x17 = 0x00000000
x18 = 0x00000000
x19 = 0x00000000
x20 = 0x00000000
x21 = 0x00000000
x22 = 0x00000000
x23 = 0x00000000
x24 = 0x00000000
x25 = 0x00000000
x26 = 0x00000000
x27 = 0x00000000
x28 = 0x00000000
x29 = 0x00000000
x30 = 0x00000000
x31 = 0x00000000
```

# **五、实现完整的minirv NPC**

![image.png](/images/posts/ysyx-e5/image%2033.png)

前面其实我们已经实现了完整的支持8条指令的minirvNPC。

### 测试minirvNPC

这段代码用于**验证 RISC-V 处理器（NPC）指令实现正确性**。它把每条指令的预期结果"编码"进寄存器值里，跑完后只要检查寄存器就能判断指令对不对。

```nasm
// NPC 指令验证程序 —— 覆盖全部 13 种指令
// 代码段：0x00 起    数据区基址：0x100（由 x1 指向）
// 约定：每个非零寄存器都是一条功能断言
// @0
10000093        // 0x00 : addi x1,  x0, 0x100    # x1 = 0x100        数据区基址，避开代码段
12345137        // 0x04 : lui  x2,  0x12345      # x2 = 0x12345000   特征魔数，用于验证存取

// ---------- 存储指令：sw / sb / sh ----------
0020a023        // 0x08 : sw   x2,  0(x1)        # [0x100] = 0x12345000   写整字
0000a183        // 0x0c : lw   x3,  0(x1)        # x3 = 0x12345000        读回整字，验证 sw/lw
00208223        // 0x10 : sb   x2,  4(x1)        # [0x104] = 0x00         只写最低字节
00209323        // 0x14 : sh   x2,  6(x1)        # [0x106] = 0x5000       只写最低半字

// 内存小端布局：0x100:00 0x101:50 0x102:34 0x103:12

// ---------- 加载指令：lb / lbu / lh / lhu ----------
00408203        // 0x18 : lb   x4,  4(x1)        # x4 = 0x00              读字节(符号扩展)
0060c283        // 0x1c : lbu  x5,  6(x1)        # x5 = 0x00              读字节(零扩展)
00009303        // 0x20 : lh   x6,  0(x1)        # x6 = 0x5000            读半字(符号扩展)
0020d383        // 0x24 : lhu  x7,  2(x1)        # x7 = 0x1234            读半字(零扩展)

// ---------- 算术与字节加载 ----------
00318433        // 0x28 : add  x8,  x3, x3       # x8 = 0x2468a000        x3+x3，验证 add
00108483        // 0x2c : lb   x9,  1(x1)        # x9 = 0x50              读 0x101 字节(正数)
00208503        // 0x30 : lb   x10, 2(x1)        # x10 = 0x34             读 0x102 字节(正数)

// ---------- 负数与符号扩展验证 ----------
ffb00813        // 0x34 : addi x16, x0, -5       # x16 = 0xfffffffb       addi 负立即数
0100a423        // 0x38 : sw   x16, 8(x1)        # [0x108] = 0xfffffffb   把 -5 写入内存
0080a883        // 0x3c : lb   x17, 8(x1)        # x17 = 0xfffffffb       读回字节 0xfb，符号扩展

// ---------- jalr 跳转验证（核心断言）----------
04c005e7        // 0x40 : jalr x11, x0, 0x4c     # 跳转 0x4c，x11 = 0x44  返回地址存入 x11
3e700613        // 0x44 : addi x12, x0, 999      # 死代码，应被跳过 -> x12 = 0
37800693        // 0x48 : addi x13, x0, 888      # 死代码，应被跳过 -> x13 = 0
00150513        // 0x4c : addi x10, x10, 1       # x10 = 0x34 + 1 = 0x35  形成最终指纹 a0
00000073        // 0x50 : ebreak                 # 停机（RTL 通过 DPI-C 通知仿真环境收尾）

// ============================================================
// 执行顺序：0x00→0x04→…→0x40(jalr)→0x4c→0x50(ebreak)
//
// 最终非零寄存器（即各项功能断言）：
//   x1  = 0x100        基址加载正确
//   x2  = 0x12345000   lui 正确
//   x3  = 0x12345000   sw/lw 正确
//   x6  = 0x5000       lh 正确
//   x7  = 0x1234       lhu 正确
//   x8  = 0x2468a000   add 正确
//   x9  = 0x50         lb 正确
//   x10 = 0x35         lb + addi 正确
//   x11 = 0x44         jalr 返回地址正确
//   x16 = 0xfffffffb   addi 负立即数正确
//   x17 = 0xfffffffb   lb 符号扩展正确
//   x12 = x13 = 0      jalr 确实跳过了死代码
// ============================================================
```

测试一下：

```bash
xi@tanxi:~/ysyx/ysyx-project/npc$ make sim
/home/xi/ysyx/ysyx-project/npc/build/top
[sim] 已加载程序镜像 /home/xi/ysyx/ysyx-project/npc/build/../sim/progs/verify.hex：21 条指令
NPC: hit EBREAK at PC = 0x50, a0 = 0x35
=== 结束状态（19 周期）===
  x0  = 0x00000000
  x1  = 0x00000100
  x2  = 0x12345000
  x3  = 0x12345000
  x4  = 0x00000000
  x5  = 0x00000000
  x6  = 0x00005000
  x7  = 0x00001234
  x8  = 0x2468a000
  x9  = 0x00000050
  x10 = 0x00000035
  x11 = 0x00000044
  x12 = 0x00000000
  x13 = 0x00000000
  x14 = 0x00000000
  x15 = 0x00000000
  x16 = 0xfffffffb
  x17 = 0xfffffffb
  x18 = 0x00000000
  x19 = 0x00000000
  x20 = 0x00000000
  x21 = 0x00000000
  x22 = 0x00000000
  x23 = 0x00000000
  x24 = 0x00000000
  x25 = 0x00000000
  x26 = 0x00000000
  x27 = 0x00000000
  x28 = 0x00000000
  x29 = 0x00000000
  x30 = 0x00000000
  x31 = 0x00000000
```

<aside>
💡

到目前为止，我们已经实现了支持8条RISC-V指令（实际上是13条指令）的minirvCPU！继续努力！

</aside>