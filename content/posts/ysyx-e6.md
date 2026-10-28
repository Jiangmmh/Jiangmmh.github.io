---
title: "一生一芯-E6阶段笔记"
date: '2026-10-28T22:18:08+08:00'
draft: false
tags: [Chisel, 芯片设计, AM, UART, klib, EDA工具]
categories: [一生一芯]
---

# **一、体验AM**

![image.png](/images/posts/ysyx-e6/image.png)

先来阅读以下PA1中第一节的内容：

![image.png](/images/posts/ysyx-e6/image%201.png)

> 一定要刻意训练自己针对问题，自行探索和学习基本原理，思考解决方案并落地解决问题的全流程能力。不要偷懒，等待别人的答案。
> 

PA的目的是要实现NEMU, 一款经过简化的**全系统模拟器**。所谓全系统模拟器就是其可以模拟完整的硬件，例如x86处理器、RISC-V处理器或红白机硬件。

AM的设计非常巧妙，我们可以通过提供不同的`ARCH`参数, 来让同一个程序编译到不同的平台上. 例如, `ARCH=native`表示将程序编译到Linux本地。

![image.png](/images/posts/ysyx-e6/image%202.png)

运行红白机模拟器，检查画面、按键和声音，没有问题。

![image.png](/images/posts/ysyx-e6/image%203.png)

NEMU模拟了一个硬件的世界, 我们可以在这个硬件世界中执行程序。换句话说, 我们将要在PA中编写一个用来执行其它程序的程序! 

```bash
                         +---------------------+  +---------------------+
                         |       NES Game      |  |    "Hello World"    |
                         +---------------------+  +---------------------+
                         |    Simulated NES    |  |      Simulated      |
                         |       hardware      |  |       hardware      |
+---------------------+  +---------------------+  +---------------------+
|    "Hello World"    |  |     NES Emulator    |  |        NEMU         |
+---------------------+  +---------------------+  +---------------------+
|      GNU/Linux      |  |      GNU/Linux      |  |      GNU/Linux      |
+---------------------+  +---------------------+  +---------------------+
|    Real hardware    |  |    Real hardware    |  |    Real hardware    |
+---------------------+  +---------------------+  +---------------------+
          (a)                      (b)                     (c)
```

- (a) 直接在GNU/Linux中运行Hello World程序
- (b) 在GNU/Linux中通过红白机模拟器，运行红白机游戏
- (c) 在GNU/Linux中通过NEMU模拟其他硬件，并运行Hello World程序

# **二、运行第一个编译的程序**

> 关键问题：为什么需要AM？
> 

现在我们已经有了一个支持执行RV32I指令的处理器，它能执行任何程序了吗？

显然不行，因为会遇到如下问题：

![image.png](/images/posts/ysyx-e6/image%204.png)

因此，除了处理器之外我们还需要为程序提供运行时环境：

![image.png](/images/posts/ysyx-e6/image%205.png)

> 事实上, AM的设计十分巧妙: 我们可以通过提供不同的ARCH参数, 来让同一个程序编译到不同的平台上. 例如, ARCH=native表示将程序编译到Linux本地。我们也可以将fceux编译到minirv上, 从而在你设计的minirv NPC上运行红白机游戏！
> 

在开始做任务之前先从整体架构的角度来理解一下一生一芯主目录下各模块的关系，下面是我让AI读取了目录中的全部内容整理得到：

- npc 是我们实现的处理器
- riscv-tests 和 am-kernels是一些用户程序
- abstrac-machine，作为处理器与用户程序的中间层，提供运行时环境和构建。
    - 硬件无关的部分（例如klib中的库函数）被统一实现
    - 硬件相关的部分由硬件开发者提供相应实现
    - AM提供了一个统一的运行时框架，如果想要支持新的ISA，就需要提供自己相应的实现。
- NEMU或minirvEMU作为Difftest的参考。

```cpp
                    ┌─────────────────────────────────────────────────┐
                    │                ysyx-project                     │
                    └─────────────────────────────────────────────────┘
  环境变量: NEMU_HOME=nemu  AM_HOME=abstract-machine  NPC_HOME=npc (由 init.sh 写入 ~/.bashrc)

  ┌────────────────┐    提供运行时+构建系统     ┌───────────────────────────┐
  │abstract-machine│◄──────────────────────────│  riscv-tests / am-kernels │
  │     (AM)       │  把每个.S 测试构建成      │  fceux-am (AM上的应用)    │
  │                │  裸机镜像并驱动仿真        └───────────────────────────┘
  └──────┬─────────┘
         │ ① hexdump 镜像 → npc/program.hex
         │ ② make -C npc run
         ▼
  ┌──────────────┐   DPI-C(pmem_read/write,   ┌──────────────┐
  │  npc (DUT)   │   ebreak_notify)           │   nemu       │
  │ Verilog RTL  │◄───────────────────────────┤ (阶段参照系,  │
  │ + Verilator  │                            │  本流程不用)  │
  │ 仿真器       │                             └──────────────┘
  └──────┬───────┘
         │ 每条指令提交后 difftest_step() 单步对比
         ▼
  ┌──────────────┐
  │  minirvEMU   │  参考模型 (C++软件模拟器, 被 npc/Makefile
  └──────────────┘  链进仿真器, 也带自己的 main 可独立运行)
```

![image.png](/images/posts/ysyx-e6/image%206.png)

> AM 把每个 rv32ui 汇编测试程序交叉编译成只含 **minirv** 支持指令、链接在 **0x80000000** 的裸机镜像，转成 hex 交给 NPC；Verilator 仿真器驱动 RTL 逐周期执行，同时用 minirvEMU 做逐指令的 DiffTest 比对（抓架构状态分叉），最终以 ebreak 时 a0 是否为 0 判定测试通过与否，退出码逐级上传汇总成 PASS/FAIL 报表。 因此一条 make ARCH=minirv-npc run TEST_ISA=i 同时验证了“程序能跑完”（功能自检 + trap 约定）和“每条指令的执行结果与黄金模型一致”（DiffTest）。
> 

我们首先来编译并运行一个简单的C程序am-kernels/tests/cpu-tests/tests/dummy.c ，其仅会返回一个0。

```bash
int main() {
  return 0;
}
```

先安装交叉工具链：

```bash
apt install g++-riscv64-linux-gnu
```

然后在am-kernels/tests/cpu-tests/目录下尝试编译它:

```bash
make ARCH=riscv32-nemu ALL=dummy
```

我出现了如下错误：

```bash
xi@tanxi:~/ysyx-project/am-kernels/tests/cpu-tests$ make ARCH=riscv32-nemu ALL=dummy
# Building dummy-image [riscv32-nemu]
# Building am-archive [riscv32-nemu]
+ CC src/platform/nemu/trm.c
In file included from /usr/riscv64-linux-gnu/include/features.h:526,
                 from /usr/riscv64-linux-gnu/include/bits/libc-header-start.h:33,
                 from /usr/riscv64-linux-gnu/include/stdint.h:26,
                 from /usr/lib/gcc-cross/riscv64-linux-gnu/13/include/stdint.h:9,
                 from /home/xi/ysyx-project/abstract-machine/am/include/am.h:4,
                 from /home/xi/ysyx-project/abstract-machine/am/src/platform/nemu/trm.c:1:
/usr/riscv64-linux-gnu/include/gnu/stubs.h:8:11: fatal error: gnu/stubs-ilp32.h: No such file or directory
    8 | # include <gnu/stubs-ilp32.h>
      |           ^~~~~~~~~~~~~~~~~~~
compilation terminated.
make[2]: *** [/home/xi/ysyx-project/abstract-machine/Makefile:112: /home/xi/ysyx-project/abstract-machine/am/build/riscv32-nemu/src/platform/nemu/trm.o] Error 1
make[1]: *** [/home/xi/ysyx-project/abstract-machine/Makefile:143: /home/xi/ysyx-project/abstract-machine/am/build/am-riscv32-nemu.a] Error 2
test list [1 item(s)]: dummy
```

安装正确的工具链：

```bash
$ sudo apt update
$ sudo apt install gcc-riscv64-unknown-elf binutils-riscv64-unknown-elf

$ riscv64-unknown-elf-gcc --version
riscv64-unknown-elf-gcc (13.2.0-11ubuntu1+12) 13.2.0
Copyright (C) 2023 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
```

修改abstract-machine/scripts/isa/riscv.mk：

```bash
# 将下面这行
CROSS_COMPILE := riscv64-linux-gnu-

# 改为：
CROSS_COMPILE := riscv64-unknown-elf-
```

重新构建：

```bash
xi@tanxi:~/ysyx-project/abstract-machine$ cd ~/ysyx-project/am-kernels/tests/cpu-tests
xi@tanxi:~/ysyx-project/am-kernels/tests/cpu-tests$ make clean
rm -rf Makefile.* build/
xi@tanxi:~/ysyx-project/am-kernels/tests/cpu-tests$ make ARCH=riscv32-nemu ALL=dummy
# Building dummy-image [riscv32-nemu]
+ CC tests/dummy.c
# Building am-archive [riscv32-nemu]
+ CC src/platform/nemu/trm.c
+ CC src/platform/nemu/ioe/ioe.c
+ CC src/platform/nemu/ioe/timer.c
+ CC src/platform/nemu/ioe/input.c
+ CC src/platform/nemu/ioe/gpu.c
+ CC src/platform/nemu/ioe/audio.c
+ CC src/platform/nemu/ioe/disk.c
+ CC src/platform/nemu/mpe.c
+ AS src/riscv/nemu/start.S
+ CC src/riscv/nemu/cte.c
+ AS src/riscv/nemu/trap.S
+ CC src/riscv/nemu/vme.c
+ AR -> build/am-riscv32-nemu.a
# Building klib-archive [riscv32-nemu]
+ CC src/stdlib.c
+ CC src/cpp.c
+ CC src/stdio.c
+ CC src/string.c
+ CC src/ctypes.c
+ CC src/int64.c
+ AR -> build/klib-riscv32-nemu.a
# Creating image [riscv32-nemu]
+ LD -> build/dummy-riscv32-nemu.elf
+ OBJCOPY -> build/dummy-riscv32-nemu.bin
test list [1 item(s)]: dummy

xi@tanxi:~/ysyx-project/am-kernels/tests/cpu-tests$ ls build/ -l
total 20
-rwxr-xr-x 1 xi xi  120 Sep 16 17:18 dummy-riscv32-nemu.bin
-rwxr-xr-x 1 xi xi 5304 Sep 16 17:18 dummy-riscv32-nemu.elf
-rw-r--r-- 1 xi xi  842 Sep 16 17:18 dummy-riscv32-nemu.txt
drwxr-xr-x 3 xi xi 4096 Sep 16 17:18 riscv32-nemu
```

可以看看编译得到的可执行程序，暂时不用理解细节：

```bash
80000000 <_start>:
80000000:	00000413          	li	s0,0
80000004:	00009117          	auipc	sp,0x9
80000008:	ffc10113          	addi	sp,sp,-4 # 80009000 <_end>
8000000c:	00c000ef          	jal	80000018 <_trm_init>

80000010 <main>:
80000010:	00000513          	li	a0,0
80000014:	00008067          	ret

80000018 <_trm_init>:
80000018:	ff010113          	addi	sp,sp,-16
8000001c:	00000517          	auipc	a0,0x0
80000020:	01c50513          	addi	a0,a0,28 # 80000038 <_etext>
80000024:	00112623          	sw	ra,12(sp)
80000028:	fe9ff0ef          	jal	80000010 <main>
8000002c:	00050513          	mv	a0,a0
80000030:	00100073          	ebreak
80000034:	0000006f          	j	80000034 <_trm_init+0x1c>
```

下面将该程序编译为minirv处理器可执行的指令：

```bash
xi@tanxi:~/ysyx-project/abstract-machine$ cd ~/ysyx-project/am-kernels/tests/cpu-tests
xi@tanxi:~/ysyx-project/am-kernels/tests/cpu-tests$ make clean
rm -rf Makefile.* build/
xi@tanxi:~/ysyx-project/am-kernels/tests/cpu-tests$ make ARCH=minirv-npc ALL=dummy
```

但是我的开发环境会出现问题，在文件~/ysyx-project/abstract-machine/tools/minirv/minirv-common.sh中，将**riscv64-linux-gnu-gcc** 改为 **riscv64-unknown-elf-gcc**。

重新编译，可以得到如下文件：

```bash
xi@tanxi:~/ysyx-project/am-kernels/tests/cpu-tests$ ls -l build/
total 20
-rwxr-xr-x 1 xi xi  136 Sep 16 17:32 dummy-minirv-npc.bin
-rwxr-xr-x 1 xi xi 5292 Sep 16 17:32 dummy-minirv-npc.elf
-rw-r--r-- 1 xi xi 1076 Sep 16 17:32 dummy-minirv-npc.txt
drwxr-xr-x 3 xi xi 4096 Sep 16 17:32 minirv-npc
```

先来看dummy.c编译得到的汇编程序，其中包含两条指令，作用是返回0。

```nasm
#include "/home/xi/ysyx/ysyx-project/abstract-machine/tools/minirv/inst-replace.h"
	.file	"dummy.c"
	.option nopic
	.attribute arch, "rv32e1p9_zicsr2p0"
	.attribute unaligned_access, 0
	.attribute stack_align, 4
	.text
	.section	.text.startup.main,"ax",@progbits
	.align	2
	.globl	main
	.hidden	main
	.type	main, @function
main:
	li	a0,0
	ret
	.size	main, .-main
	.ident	"GCC: (13.2.0-11ubuntu1+12) 13.2.0"
```

再来看与AM链接后得到的目标文件反汇编结果（am-kernels/tests/cpu-tests/build/dummy-minirv-npc.txt）：

```nasm
80000000 <_start>:
80000000:	00000413          	li	s0,0
80000004:	80009137          	lui	sp,0x80009
80000008:	00010113          	mv	sp,sp
8000000c:	800000b7          	lui	ra,0x80000
80000010:	02008093          	addi	ra,ra,32 # 80000020 <_trm_init>
80000014:	000080e7          	jalr	ra

80000018 <main>:
80000018:	00000513          	li	a0,0
8000001c:	00008067          	ret

80000020 <_trm_init>:
80000020:	ff410113          	addi	sp,sp,-12 # 80008ff4 <_stack_top+0x7ff4>
80000024:	80000537          	lui	a0,0x80000
80000028:	04850513          	addi	a0,a0,72 # 80000048 <_etext>
8000002c:	00112423          	sw	ra,8(sp)
80000030:	800000b7          	lui	ra,0x80000
80000034:	01808093          	addi	ra,ra,24 # 80000018 <main>
80000038:	000080e7          	jalr	ra
8000003c:	80000237          	lui	tp,0x80000
80000040:	03c20213          	addi	tp,tp,60 # 8000003c <_trm_init+0x1c>
80000044:	00020067          	jr	tp # 0 <_entry_offset>
```

可以看到除了原来的main函数中的两条指令外，还在main函数前后加上了两个函数 **_start**和 **_trm_init**的指令。

> 关键问题：AM给我们加上的这两个函数是什么？
> 

**_start**是一个汇编函数，存放于**abstract-machine/am/src/riscv/npc/start.S**中，其中调用了 **_trm_init**函数。

```nasm
.section entry, "ax"
.globl _start
.type _start, @function

_start:
  mv s0, zero
  la sp, _stack_pointer
  call _trm_init

.size _start, . - _start
```

而 **_trm_init**存放于**abstract-machine/am/src/riscv/npc/trm.c**中，其中先调用了main函数，返回后调用halt函数。这里的halt函数仅仅是做了一个死循环。

```c
void halt(int code) {
  while (1);
}

void _trm_init() {
  int ret = main(mainargs);
  halt(ret);
}
```

将其写入npc目录下的**program.hex**：

```nasm
00000413
80009137
00010113
800000b7
02008093
000080e7
00000513
00008067
ff410113
80000537
04850513
00112423
800000b7
01808093
000080e7
80000237
03c20213
00020067
```

为了让npc处理器正确地运行AM程序还要进行几点修改。

> 
> 
> 
> AM中的minirv-npc运行时环境约定程序从0x80000000开始. 虽然不是强制的, 但RISC-V处理器通常把0x80000000以下的地址空间留给设备使用. 我们会在下文继续讨论设备的话题. 总之, 为了在minirv NPC中运行dummy程序, 你还需要:
> 
> 1. 将NPC的PC复位值修改为0x80000000
> 2. 修改pmem_read()和pmem_write(), 根据参数addr距离0x80000000的偏移来访问存储器数组

在仿真开始时刻（rst生效前的组合取指）PC中存储的可能是无效值，因此修改 Top.scala，让程序基址与AM对齐，即将其设置为0x80000000：

```verilog
  // ---------------- 取指 ----------------
  // 程序的基址：和 AM(abstract-machine) / nemu / ysyxSoC 一致，都是 0x80000000。
  // 内存是 C 侧那块 16MB 平坦内存 + 地址掩码（0x80000000 & 0xFFFFFF = 0），
  // 所以镜像装在 offset 0，程序里看到的地址和这里算出来的地址始终自洽。
  val memBase = BigInt("80000000", 16) // 注意要指定 16 进制，BigInt(String) 默认按十进制解析
```

这里暂时添加一个脚本，用于编译cpu-test中的程序并将镜像存储到sim/progs/目录下：

```bash
#!/bin/sh
# 用 AM(abstract-machine) 编译一个 cpu-test，转成 npc 能加载的 hex 镜像
#
# 用法: am_build.sh <test-name> <arch> <输出 hex>
#   例: am_build.sh dummy minirv-npc sim/progs/dummy-am.hex
#
# 步骤:
#   1. 在 am-kernels/tests/cpu-tests 下生成 Makefile.<test>（AM 的入口文件）
#   2. make -f Makefile.<test> ARCH=<arch> image  ->  build/<test>-<arch>.elf / .bin
#   3. 把 .bin 转成 npc 的 hex 格式：每行一条 32 bit 指令（小端），前面加 @<入口地址>
#      地址取自 ELF 的入口地址（AM 的链接基址，0x80000000）
#
# 生成的 hex 用的是 npc 的地址空间基址 0x80000000（和 AM / nemu / ysyxSoC 一致）。
set -e

if [ $# -ne 3 ]; then
  echo "用法: $0 <test-name> <arch> <输出 hex>" >&2
  exit 1
fi

TEST=$1
ARCH=$2
OUT=$3

# 脚本在 <repo>/npc/sim/ 下，仓库根就是上两层
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
AM_HOME="$ROOT/abstract-machine"
TESTS="$ROOT/am-kernels/tests/cpu-tests"

if [ ! -d "$AM_HOME" ]; then
  echo "找不到 AM：$AM_HOME" >&2
  exit 1
fi
if [ ! -f "$TESTS/tests/$TEST.c" ]; then
  echo "找不到测试源文件：$TESTS/tests/$TEST.c" >&2
  exit 1
fi

OUT_DIR=$(dirname "$OUT")
mkdir -p "$OUT_DIR"
OUT_DIR=$(cd "$OUT_DIR" && pwd) # 后面要 cd 到别处，先把路径定死成绝对路径
OUT="$OUT_DIR/$(basename "$OUT")"

cd "$TESTS"
printf 'NAME = %s\nSRCS = tests/%s.c\ninclude ${AM_HOME}/Makefile\n' "$TEST" "$TEST" > "Makefile.$TEST"
trap 'rm -f "$TESTS/Makefile.$TEST"' EXIT
make -s -f "Makefile.$TEST" ARCH="$ARCH" image

ELF="build/$TEST-$ARCH.elf"
BIN="build/$TEST-$ARCH.bin"
if [ ! -f "$BIN" ]; then
  echo "没生成镜像：$BIN" >&2
  exit 1
fi

# 入口地址 = 镜像的装载地址（AM 的链接脚本把代码段放在 _pmem_start = 0x80000000）
ENTRY=$(riscv64-unknown-elf-readelf -h "$ELF" | awk '/Entry point/{print $4}')
if [ -z "$ENTRY" ]; then
  echo "读不出入口地址：$ELF" >&2
  exit 1
fi

# .bin 是紧凑的原始字节，转成 npc 的 hex 格式（每行一个 32 bit 字，小端）
{ echo "@$ENTRY"; hexdump -v -e '1/4 "%08x\n"' "$BIN"; } > "$OUT"

echo "[am_build] $TEST ($ARCH) -> $OUT（基址 $ENTRY，$(wc -l < "$OUT") 行）"

```

修改仿Makefile：

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
# difftest.cpp 要 include 参考侧的 minirvEMU.h（verilator 在 obj_dir 里编译，要绝对路径）
VERILATOR_CFLAGS += -CFLAGS "-I$(abspath $(EMU_DIR))"

CXX      = g++
CXXFLAGS = -O2 -Wall

# 参考侧：old-minirvEMU（自带 main()，编译时改名，免得和仿真主程序打架）
EMU_DIR = ../old-minirvEMU
EMU_SRC = $(EMU_DIR)/minirvEMU.cpp
EMU_OBJ = $(abspath $(BUILD_DIR)/emu/minirvEMU.o)

# Chisel 源文件（RTL 的唯一真相）
CHISEL_SRCS = $(shell find $(CHISEL_DIR)/src/main/scala -name "*.scala")

# C++ 源文件：仿真主程序 + C 侧内存（DPI-C）+ ebreak 通知（DPI-C）+ 对拍
CSRCS = $(SIM_DIR)/sim_main.cpp $(SIM_DIR)/sim_mem.cpp $(SIM_DIR)/sim_halt.cpp \
        $(EMU_OBJ)

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
# 对拍：npc 和 old-minirvEMU 逐拍比对（PC + 32 个寄存器）
# ---------------------------------------------------------------------------
DIFFTEST_PROG ?= $(SIM_DIR)/progs/verify.hex

difftest: $(BIN)
	$(BIN) --difftest $(DIFFTEST_PROG)

# ---------------------------------------------------------------------------
# AM(abstract-machine) 的 cpu-tests
#
#   make am-test                 跑 dummy
#   make am-test AM_TEST=add     跑别的测试
#
# 镜像由 sim/am_build.sh 编出来：AM 编成 .bin，再转成 npc 的 hex 格式。
# 程序的返回值放在 ebreak 的 a0 里（AM 的 halt(code)），退出码用它。
# ---------------------------------------------------------------------------
AM_HOME  = ../abstract-machine
AM_TESTS = ../am-kernels/tests/cpu-tests
AM_ARCH  = minirv-npc
AM_TEST  ?= dummy
AM_HEX    = $(SIM_DIR)/progs/$(AM_TEST)-am.hex

am-test: $(BIN) $(AM_HEX)
	$(BIN) --exit-code $(AM_HEX)

$(AM_HEX): $(AM_TESTS)/tests/$(AM_TEST).c \
           $(AM_HOME)/am/src/riscv/npc/trm.c \
           $(AM_HOME)/scripts/linker.ld
	sh $(SIM_DIR)/am_build.sh $(AM_TEST) $(AM_ARCH) $@

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

# 编译参考侧 old-minirvEMU：它的 main() 改名，避免和仿真主程序冲突
$(EMU_OBJ): $(EMU_SRC) $(EMU_DIR)/minirvEMU.h
	mkdir -p $(dir $@)
	$(CXX) $(CXXFLAGS) -Dmain=emu_main -c -o $@ $<

.PHONY: default all clean lint test sim trace am-test format checkformat chisel-generate

```

测试一下：

```bash
xi@tanxi:~/ysyx/ysyx-project/npc$ make am-test 
- V e r i l a t i o n   R e p o r t: Verilator 5.052 2026-09-05 rev v5.052
- Verilator: Built from 0.178 MB sources in 10 modules, into 0.119 MB in 9 C++ files needing 0.000 MB
- Verilator: Walltime 0.727 s (elab=0.002, cvt=0.012, bld=0.708); cpu 0.019 s on 1 threads; allocated 20.352 MB
/home/xi/ysyx/ysyx-project/npc/build/top --exit-code ./sim/progs/dummy-am.hex
[sim] 已加载程序镜像 ./sim/progs/dummy-am.hex：36 条指令
```

因为halt采用死循环实现，所以会指令循环会一直执行，直到超出我们设置的最大指令执行数。

# **三、搭建批量运行程序的流程**

现在我们来搭建一个支持程序批量自动运行的流程, 来高效地运行各种程序。

![image.png](/images/posts/ysyx-e6/image%207.png)

为了让程序在执行完指令后自动停止，这里修改halt函数，在其中使用内联汇编，加入两条指令：

- **mv**，这是一条伪指令，会被编译为**addi a0, a0, imm**，将参数**code**的值写入寄存器**a0**
    - 这里的code就是main函数的返回值
    - %0的就是指code
- **ebreak**，用于终止程序，最终在npc处理器中会通过DPI-C机制调用**ebreak_notify**函数

```c
void halt(int code) {
  asm volatile("mv a0, %0; ebreak" : :"r"(code));
  while (1); 
}
```

重新在npc中测试运行dummy：

```bash
xi@tanxi:~/ysyx/ysyx-project/npc$ make am-test 
- V e r i l a t i o n   R e p o r t: Verilator 5.052 2026-09-05 rev v5.052
- Verilator: Built from 0.178 MB sources in 10 modules, into 0.119 MB in 9 C++ files needing 0.000 MB
- Verilator: Walltime 0.727 s (elab=0.002, cvt=0.012, bld=0.708); cpu 0.019 s on 1 threads; allocated 20.352 MB
/home/xi/ysyx/ysyx-project/npc/build/top --exit-code ./sim/progs/dummy-am.hex
[sim] 已加载程序镜像 ./sim/progs/dummy-am.hex：36 条指令
NPC: hit EBREAK at PC = 0x80000040, a0 = 0x0
```

可以看到，寄存器a0的值被置为了0，准确无误。

![image.png](/images/posts/ysyx-e6/image%208.png)

我们可以在仿真程序**main.c**中的指令循环结束后对a0寄存器进行判断，如果值为0就输出 **”HIT GOOD TRAP“** ，否则输出 **”HIT BAD TRAP“**

```cpp
int main(int argc, char **argv) {
  Verilated::commandArgs(argc, argv);

  std::string prog_path = default_prog_path();
  uint64_t max_cycles = 32;
  bool trace = false;
  bool difftest = false;

  for (int i = 1; i < argc; i++) {
    std::string opt = argv[i];
    if (opt == "--cycles" && i + 1 < argc) {
      max_cycles = strtoull(argv[++i], nullptr, 10);
    } else if (opt == "--trace") {
      trace = true;
    }  else if (opt[0] != '-') {
      prog_path = opt; // 第一个非选项参数 = 程序文件
    } else {
      usage(argv[0]);
      return -1;
    }
  }

  // 对拍模式：npc 和 old-minirvEMU 逐拍比寄存器
  if (difftest) {
    int ret = difftest_run(prog_path, max_cycles, trace);
    dut.final();
    return ret;
  }

  // 程序装进 C 侧内存（RTL 取指和数据访问都走这块内存）
  mem_load_image(prog_path.c_str());

  dut_reset(2);

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
             (unsigned long long)cycle, pc, instr, dut.io_pc

    // RTL 通过 DPI-C 通知过：程序执行到 ebreak 了，收尾
    if (np_halted()) break;
  }

  if (!np_halted()) {
    printf("[sim] 程序没有执行到 ebreak，跑满 %llu 个周期就停了\n",
           (unsigned long long)cycle);
  }

  // -------------------------------------------------------------------------
  // 判结果：程序 trap 退出时 a0 里是它的返回值，0 = 成功，非 0 = 失败
  // -------------------------------------------------------------------------
  bool good = np_halted() && (np_halt_code() == 0);
  printf(good ? "HIT GOOD TRAP\n" : "HIT BAD TRAP\n");

  dut.final();
  return good ? 0 : 1;
}
```

重新运行dummy：

```bash
xi@tanxi:~/ysyx/ysyx-project/npc$ make am-test 
- V e r i l a t i o n   R e p o r t: Verilator 5.052 2026-09-05 rev v5.052
- Verilator: Built from 0.178 MB sources in 10 modules, into 0.119 MB in 9 C++ files needing 0.000 MB
- Verilator: Walltime 0.727 s (elab=0.002, cvt=0.012, bld=0.708); cpu 0.019 s on 1 threads; allocated 20.352 MB
/home/xi/ysyx/ysyx-project/npc/build/top --exit-code ./sim/progs/dummy-am.hex
[sim] 已加载程序镜像 ./sim/progs/dummy-am.hex：36 条指令
NPC: hit EBREAK at PC = 0x80000040, a0 = 0x0
HIT GOOD TRAP
```

现在尝试wrong.c这个程序：

```c
int main() {
  return 1;
}
```

运行npc：

```bash
xi@tanxi:~/ysyx-project/npc$ make run
[sim] 已加载程序镜像 ./sim/progs/wrong-am.hex：36 条指令
NPC: hit EBREAK at PC = 0x80000040, a0 = 0x1
HIT BAD TRAP
make: *** [Makefile:97: am-test] Error 1
```

> 进一步地, 我们可以将启动仿真时的命令与Makefile关联起来, 使得在运行类似的`make run`命令时能自动进行仿真. 具体地, 你需要在`abstract-machine/scripts/platform/npc.mk`中实现一条`run`规则, 使得键入`make ARCH=minirv-npc ALL=dummy run`后可以自动编译并在NPC中运行`dummy`程序. 此外, 只要将`ALL=dummy`改为`ALL=wrong`, 就能编译并运行`wrong`程序。
> 

![image.png](/images/posts/ysyx-e6/image%209.png)

首先来分析下下其中的调用过程：

- 我们会在目录am-kernels/tests/cpu-tests下执行命令make ARCH=minirv-npc ALL=wrong
- 在该Makefile中包含了目录abstract-machine/中的Makefile
- 其中根据变量ARCHS的值，包含abstract-machine/scripts中对应的.mk文件，例如这里包含的是minirv-npc.mk
- 在minirv-npc.mk中又包含了scripts/isa/riscv.mk和scripts/platform/npc.mk

现在我们将目光放在npc.mk中，其中做了如下几件事：

```makefile
insert-arg: image
	@python $(AM_HOME)/tools/insert-arg.py $(IMAGE).bin $(MAINARGS_MAX_LEN) $(MAINARGS_PLACEHOLDER) "$(mainargs)
image: image-dep
	@$(OBJDUMP) -d $(IMAGE).elf > $(IMAGE).txt
	@echo + OBJCOPY "->" $(IMAGE_REL).bin
	@$(OBJCOPY) -S --set-section-flags .bss=alloc,contents -O binary $(IMAGE).elf $(IMAGE).bin

run: insert-arg image

.PHONY: insert-arg
```

- insert-arg：运行 Python 脚本 `insert-arg.py`，向生成的二进制镜像中插入程序参数
- image：
    - 第一条命令，使用 objdump 对 ELF 文件进行反汇编，并保存成文本文件。
    - 第二条命令，打印提示信息。
    - 第三条命令，使用 objcopy 把 ELF 文件转换成纯二进制文件。

可以看到在run命令中依赖了insert-arg命令，该命令已经将目标应用程序编译好了，我们仅需要在run命令中将编译得到的二进制程序转换为npc处理器能够识别的十六进制程序，然后执行npc目录下的make run即可。

修改**abstract-machine/scripts/platform/npc.mk**，实现上述功能：

- 可以看到run依赖于image，image会先将应用程序编译未二进制文件
- 然后执行二进制程序转换任务：将AM生成的二进制文件转换为npc能识别的格式
    - 在run中会读取ELF文件中的信息，获取入口地址，将其写入第一行
    - 然后将剩余的指令写到其后
- 最后通过 make -C 命令执行npc中的Makefile命令
- 注意暂时还未实现difftest功能，暂时不通关其中的DIFFTEST和TRACE

```makefile
NPC_DIR   = $(abspath $(AM_HOME)/../npc)
NPC_TOP   = $(NPC_DIR)/build/top
NPC_CYCLES = 10000000   # 跑测试的周期上限（npc 自己的默认 32 太小；npc 约 3000 万周期/秒）

# 在 npc 上跑这个测试：
#   1. 把 AM 编出来的镜像转成 npc 的 hex 格式（入口地址 + 每行一条 32 bit 指令）
#   2. 调 npc 自己的 Makefile 跑：构建、跑程序、判结果都在 npc 那边，这里不重复一套
#
# 加 DIFFTEST=1 就顺便和 old-minirvEMU 逐拍对拍（npc 的 --difftest 选项）：
#   make ARCH=minirv-npc DIFFTEST=1 run
run: image
	@ENTRY=$$(riscv64-unknown-elf-readelf -h $(IMAGE).elf | awk '/Entry point/{print $$4}'); \
	 { echo "@$$ENTRY"; hexdump -v -e '1/4 "%08x\n"' $(IMAGE).bin; } > $(IMAGE).hex; \
	$(MAKE) -C $(NPC_DIR) run PROG=$(IMAGE).hex CYCLES=$(NPC_CYCLES) \
	          DIFFTEST=$(DIFFTEST) TRACE=$(TRACE)

.PHONY: image insert-arg run

```

测试一下dummy和wrong两个程序：

```bash
xi@tanxi:~/ysyx-project/am-kernels/tests/cpu-tests$ make ARCH=minirv-npc ALL=dummy run
# Building dummy-run [minirv-npc]
# Building am-archive [minirv-npc]
# Building klib-archive [minirv-npc]
+ OBJCOPY -> build/dummy-minirv-npc.bin
mainargs=
- V e r i l a t i o n   R e p o r t: Verilator 5.052 2026-09-05 rev v5.052
- Verilator: Built from 0.166 MB sources in 10 modules, into 0.360 MB in 6 C++ files needing 0.000 MB
- Verilator: Walltime 0.159 s (elab=0.002, cvt=0.020, bld=0.131); cpu 0.027 s on 1 threads; allocated 21.270 MB
[sim] 已加载程序镜像 /home/xi/ysyx/ysyx-project/am-kernels/tests/cpu-tests/build/dummy-minirv-npc.hex：36 条指令
NPC: hit EBREAK at PC = 0x80000040, a0 = 0x0HIT GOOD TRAP
test list [1 item(s)]: dummy
[         dummy] PASS
```

```bash
xi@tanxi:~/ysyx-project/am-kernels/tests/cpu-tests$ make ARCH=minirv-npc ALL=wrong run
# Building wrong-run [minirv-npc]
# Building am-archive [minirv-npc]
# Building klib-archive [minirv-npc]
+ OBJCOPY -> build/wrong-minirv-npc.bin
mainargs=
- V e r i l a t i o n   R e p o r t: Verilator 5.052 2026-09-05 rev v5.052
- Verilator: Built from 0.166 MB sources in 10 modules, into 0.360 MB in 6 C++ files needing 0.000 MB
- Verilator: Walltime 0.161 s (elab=0.002, cvt=0.020, bld=0.133); cpu 0.027 s on 1 threads; allocated 21.539 MB
[sim] 已加载程序镜像 /home/xi/ysyx/ysyx-project/am-kernels/tests/cpu-tests/build/dummy-minirv-npc.hex：36 条指令
NPC: hit EBREAK at PC = 0x80000040, a0 = 0x0HIT BAD TRAP
test list [1 item(s)]: wrong
[         wrong] PASS
```

可以看到运行wrong程序时，在终端中仍然输出了PASS。这是因为仿真环境在发现程序以`a0`不为`0`的状态运行`ebreak`指令时, 并没有将"程序运行出错"的信息返回给启动仿真的Makefile, 导致Makefile认为仿真结果正确, 从而显示`PASS` 。

这部分条件的判断位于：**am-kernels/tests/cpu-tests/Makefile**中，如果结果为1就执行输出PASS，非1就输出FAIL。

```makefile
Makefile.%: tests/%.c latest
	@/bin/echo -e "NAME = $*\nSRCS = $<\ninclude $${AM_HOME}/Makefile" > $@
	@if make -s -f $@ ARCH=$(ARCH) $(MAKECMDGOALS); then \
		printf "[%14s] $(COLOR_GREEN)PASS$(COLOR_NONE)\n" $* >> $(RESULT); \
	else \
		printf "[%14s] $(COLOR_RED)***FAIL***$(COLOR_NONE)\n" $* >> $(RESULT); \
	fi
	-@rm -f Makefile.$*
```

![image.png](/images/posts/ysyx-e6/image%2010.png)

修改npc中的main函数，当a0的值为0时，返回0；否则返回1。

```c
int main(int argc, char *argv[]) {
    ......
    // -------------------------------------------------------------------------
	  // 判结果：程序 trap 退出时 a0 里是它的返回值，0 = 成功，非 0 = 失败
	  // -------------------------------------------------------------------------
	  bool good = np_halted() && (np_halt_code() == 0);
	  printf(good ? "HIT GOOD TRAP\n" : "HIT BAD TRAP\n");
	
	  dut.final();
	  return good ? 0 : 1;
}
```

测试一下：

```bash
xi@tanxi:~/ysyx/ysyx-project/am-kernels/tests/cpu-tests$ make ARCH=minirv-npc ALL=dummy run
# Building dummy-run [minirv-npc]
# Building am-archive [minirv-npc]
# Building klib-archive [minirv-npc]
+ OBJCOPY -> build/dummy-minirv-npc.bin
[sim] 已加载程序镜像 /home/xi/ysyx/ysyx-project/am-kernels/tests/cpu-tests/build/dummy-minirv-npc.hex：36 条指令
NPC: hit EBREAK at PC = 0x80000040, a0 = 0x0
HIT GOOD TRAP
test list [1 item(s)]: dummy
[         dummy] PASS

xi@tanxi:~/ysyx/ysyx-project/am-kernels/tests/cpu-tests$ make ARCH=minirv-npc ALL=wrong run
# Building wrong-run [minirv-npc]
# Building am-archive [minirv-npc]
# Building klib-archive [minirv-npc]
+ OBJCOPY -> build/wrong-minirv-npc.bin
[sim] 已加载程序镜像 /home/xi/ysyx/ysyx-project/am-kernels/tests/cpu-tests/build/wrong-minirv-npc.hex：36 条指令
NPC: hit EBREAK at PC = 0x80000040, a0 = 0x1
HIT BAD TRAP
make[1]: *** [/home/xi/ysyx/ysyx-project/abstract-machine/scripts/platform/npc.mk:38: run] Error 1
test list [1 item(s)]: wrong
[         wrong] ***FAIL***
```

# **四、运行更多程序**

## 测试riscv-test

前面我们已经为批处理搭建好了流程，现在测试一下：

![image.png](/images/posts/ysyx-e6/image%2011.png)

下面的测试虽然是测试RV32I的全部指令，但是AM的构建过程保证最终生成的二进制文件中仅包含minirv的指令, 因此riscv-tests同样能用于当前的minirv NPC。

```bash
test list [38 item(s)]: add addi and andi auipc beq bge bgeu blt bltu bne jal jalr lb lbu lh lhu lui lw or ori sb sh simple sll slli slt slti sltiu sltu sra srai srl srli sub sw xor xori
[           add] PASS
[          addi] PASS
[           and] PASS
[          andi] PASS
[         auipc] PASS
[           beq] PASS
[           bge] PASS
[          bgeu] PASS
[           blt] PASS
[          bltu] PASS
[           bne] PASS
[           jal] PASS
[          jalr] PASS
[            lb] PASS
[           lbu] PASS
[            lh] PASS
[           lhu] PASS
[           lui] PASS
[            lw] PASS
[            or] PASS
[           ori] PASS
[            sb] PASS
[            sh] PASS
[        simple] PASS
[           sll] PASS
[          slli] PASS
[           slt] PASS
[          slti] PASS
[         sltiu] PASS
[          sltu] PASS
[           sra] PASS
[          srai] PASS
[           srl] PASS
[          srli] PASS
[           sub] PASS
[            sw] PASS
[           xor] PASS
[          xori] PASS
```

## 为minirvCPU添加DiffTest机制

![image.png](/images/posts/ysyx-e6/image%2012.png)

前面我们已经实现了minirvEMU，现在只需要在npc的仿真程序中引入minirvEMU，让它与npc同步执行程序，然后在每条指令执行完毕后比对两者的状态（寄存器 or 内存），如果发现有出入就立即报错。

在npc/sim/目录下实现difftest框架，其中主要通过函数difftest_run()执行difftest，其包含三个参数：

- 要执行的程序（.hex）
- 最大cycles
- 是否开启追踪（每个指令周期都输出一下当前的pc、指令等信息）

```cpp
// difftest.h
#pragma once

#include <cstdint>
#include <string>

// npc 与 old-minirvEMU 的对拍：两边从同一个程序、同一个 PC 开始，
// 一条指令一条指令同步走，每走一条就把 32 个寄存器和 PC 对一遍。
// 返回 0 = 全程一致，1 = 出现不一致。
int difftest_run(const std::string &prog_path, uint64_t max_cycles, bool trace);
```

实现该函数，其中做了如下事情：

- 将prog_path对应的程序分别装入minirvEMU和npc的内存中
- 开始执行指令循环
    - 检查两者pc的值是否相等
    - 检查两者取出的指令是否相同
    - 两者分别调用 dut_single_cycle() 和 inst_cycle() 同步推进一个指令周期
    - 结束后比较32个通用寄存器的值是否相同，如果有出入就输出错误信息，并停止执行

```cpp
// npc 与 old-minirvEMU 的对拍（difftest）
//
// 做法很简单，不搞复杂机制：
//   1. 同一个程序镜像装两份：npc 侧装进 C 侧内存（DPI-C 访问的那块），
//      参考侧装进 old-minirvEMU 自己的内存 M[]。
//   2. 两边从同一个 PC（0）开始，一条指令一条指令同步走。
//   3. 每走一条就把 32 个寄存器对一遍，PC 也对一遍；不一致立刻报错退出。
//   4. 程序跑到 ebreak（0x00100073）就收工：npc 侧由 DPI-C 通知停机，
//      参考侧遇到 ebreak 会自己 exit(0)，所以那条指令不喂给它。
//
// 参考侧用的是 old-minirvEMU/minirvEMU.cpp：
//   - 它把状态放在全局变量 PC / R[32] / M[65536] 里，这里直接 extern 过来用
//   - 它自带 main()，编译时用 -Dmain=emu_main 改名，免得和仿真主程序打架
//   - 它只认 ebreak = 0x00100073（0x00000073 是 ecall，它会当成非法指令）
#include "difftest.h"
#include "sim_dut.h"
#include "sim_mem.h"
#include "sim_halt.h"

#include "minirvEMU.h" // 参考侧的接口：inst_cycle()

#include <cstdio>
#include <cstring>

// old-minirvEMU/minirvEMU.cpp 里的全局状态
extern uint32_t PC;    // 参考侧的 PC
extern uint32_t R[32]; // 参考侧的寄存器堆

#define EMU_MEM_SIZE (16 * 1024 * 1024) // 必须和 npc 侧（sim_mem.cpp 的 MEM_SIZE）一致
extern uint8_t M[EMU_MEM_SIZE]; // 参考侧的内存

#define EMU_EBREAK 0x00100073u

// 取参考侧内存里的指令（和 EMU 自己取指的方式一致：小端）
static uint32_t emu_fetch(uint32_t addr) {
  return (uint32_t)M[(addr + 0) & (EMU_MEM_SIZE - 1)] |
         ((uint32_t)M[(addr + 1) & (EMU_MEM_SIZE - 1)] << 8) |
         ((uint32_t)M[(addr + 2) & (EMU_MEM_SIZE - 1)] << 16) |
         ((uint32_t)M[(addr + 3) & (EMU_MEM_SIZE - 1)] << 24);
}

// 打印一次不一致的现场，方便定位
static void dump_context(uint32_t inst, uint64_t cycle) {
  printf("       上下文：cycle = %llu，PC = 0x%08x，instr = 0x%08x\n",
         (unsigned long long)cycle, dut.io_pc, inst);
  printf("       npc 寄存器：");
  for (int i = 0; i < 32; i++) printf(" %d:0x%08x", i, dut_get_reg(i));
  printf("\n       emu 寄存器：");
  for (int i = 0; i < 32; i++) printf(" %d:0x%08x", i, R[i]);
  printf("\n");
}

int difftest_run(const std::string &prog_path, uint64_t max_cycles, bool trace) {
  // ---------------- DUT 侧复位 ----------------
  // 程序装进 C 侧内存：取指和数据访问都走这一块
  mem_load_image(prog_path.c_str());
  dut_reset(2);
  
  // ---------------- 参考侧复位 ----------------
  // 参考侧自己的初始化函数 miniRV_init() 固定去读当前目录下的 program.hex，
  // 这里不用它，直接把状态清干净、镜像装进它的内存。
  // 基址跟着 DUT 走：DUT 复位后的 PC 就是程序的基址（0x80000000），
  // 两边从同一个 PC 起步才能逐拍对齐。
  uint32_t base = dut.io_pc;
  PC = base;
  for (int i = 0; i < 32; i++) R[i] = 0;
  memset(M, 0, sizeof(M));
  mem_load_image_to(M, EMU_MEM_SIZE, prog_path.c_str(), true);
	
  printf("[difftest] 程序     ：%s\n", prog_path.c_str());
  printf("[difftest] 基址     ：0x%08x\n", base);
  printf("[difftest] 参考侧   ：old-minirvEMU（内存 16MB，和 npc 一致）\n");
  printf("[difftest] DUT 侧   ：npc（Chisel RTL）\n");

  uint64_t cycle = 0;
  while (cycle < max_cycles) {
    uint32_t npc_pc = dut.io_pc;
    uint32_t emu_pc = PC;

    // PC 得先对上，否则后面比什么都不算数
    if (npc_pc != emu_pc) {
      printf("FAIL 第 %llu 拍：PC 不一致，npc = 0x%08x，emu = 0x%08x\n",
             (unsigned long long)(cycle + 1), npc_pc, emu_pc);
      return 1;
    }

    // 同一个 PC 上，两边取到的指令也该一样
    uint32_t emu_inst = emu_fetch(emu_pc);
    uint32_t npc_inst = dut.io_instr;
    if (emu_inst != npc_inst) {
      printf("FAIL 第 %llu 拍：取到的指令不一致，npc = 0x%08x，emu = 0x%08x\n",
             (unsigned long long)(cycle + 1), npc_inst, emu_inst);
      return 1;
    }

    bool is_ebreak = (emu_inst == EMU_EBREAK);
		
    // 两边各走一条
    dut_single_cycle();
    if (!is_ebreak) inst_cycle(); // 参考侧遇到 ebreak 会 exit(0)，所以不喂它
    cycle++;

    // ---------------- 比对 32 个寄存器 ----------------
    for (int i = 0; i < 32; i++) {
      unsigned int npc_reg = dut_get_reg(i);
      unsigned int emu_reg = R[i];
      if (npc_reg != emu_reg) {
        printf("FAIL 第 %llu 拍：x%d 不一致，npc = 0x%08x，emu = 0x%08x\n",
               (unsigned long long)cycle, i, npc_reg, emu_reg);
        dump_context(emu_inst, cycle);
        return 1;
      }
    }

    // npc 侧是靠 DPI-C 通知停机的：通知了就得正好是 ebreak 这一条
    if (np_halted() != is_ebreak) {
      printf("FAIL 第 %llu 拍：停机信号和参考侧对不上（npc 停机 = %d，ebreak = %d）\n",
             (unsigned long long)cycle, (int)np_halted(), (int)is_ebreak);
      dump_context(emu_inst, cycle);
      return 1;
    }

    if (trace) {
      printf("[%3llu] pc=%08x instr=%08x  x1=0x%08x x10=0x%08x\n",
             (unsigned long long)cycle, npc_pc, emu_inst, dut_get_reg(1), dut_get_reg(10));
    }

    if (is_ebreak) {
      printf("[difftest] 两侧都在 PC = 0x%08x 的 ebreak 停机，共 %llu 拍\n",
             npc_pc, (unsigned long long)cycle);
      printf("[difftest] PASS：%llu 拍全程一致（PC + 32 个寄存器）\n",
             (unsigned long long)cycle);
      // 顺便报一下程序自己的返回值（a0 = 0 表示它报告成功）：
      // 对拍只说明两边一致，程序本身对不对是另一回事。
      unsigned int code = np_halt_code();
      printf(code == 0 ? "HIT GOOD TRAP\n" : "HIT BAD TRAP\n");
      return 0;
    }
  }

  printf("[difftest] 跑满 %llu 拍还没停机（程序里没有 ebreak？）\n",
         (unsigned long long)cycle);
  return 1;
}

```

重新编写仿真程序，如果发现参数中存在 --difftest 就就直接去执行 difftest_run() 函数。

```cpp
int main(int argc, char *argv[]) {
		.....
		
		bool difftest = false;
		
		// 参数解析
	  for (int i = 1; i < argc; i++) {
	    std::string opt = argv[i];
	    if (opt == "--cycles" && i + 1 < argc) {
	      max_cycles = strtoull(argv[++i], nullptr, 10);
	    } else if (opt == "--trace") {
	      trace = true;
	    } else if (opt == "--difftest") {
	      difftest = true;
	    } else if (opt[0] != '-') {
	      prog_path = opt; // 第一个非选项参数 = 程序文件
	    } else {
	      usage(argv[0]);
	      return -1;
	    }
	  }
	  
    // Difftest：npc 和 old-minirvEMU 逐拍比对指令的执行和寄存器状态
	  if (difftest) {
	    int ret = difftest_run(prog_path, max_cycles, trace);
	    dut.final();
	    return ret;
	  }
	  
	  .....
}
```

修改npc下的Makefile，让其支持difftest：

```makefile
# ---------------------------------------------------------------------------
# npc：Chisel 写的 RV32I 单周期核 + verilator 仿真
#
#   make run                    跑默认程序（sim/progs/verify.hex）
#   make run PROG=xxx           跑别的程序
#   make run DIFFTEST=1         顺便和 old-minirvEMU 逐拍对拍
#   make run TRACE=1            逐周期打印 PC / 指令
#   make run CYCLES=10000000    改周期上限（默认 32）
#   make clean                  清生成物
#
# AM(abstract-machine) 的 cpu-tests 在 am-kernels/tests/cpu-tests 下跑：
#   make ARCH=minirv-npc [ALL=xxx] [DIFFTEST=1] run
# 想把某个 AM 测试编成 npc 能跑的 hex：
#   sh sim/am_build.sh dummy minirv-npc sim/progs/dummy-am.hex
# ---------------------------------------------------------------------------

TOPNAME  = top
BUILD_DIR = ./build
OBJ_DIR   = $(BUILD_DIR)/obj_dir
BIN       = $(abspath $(BUILD_DIR)/$(TOPNAME))

# 默认目标：只编译，不跑程序（跑程序用 make run）
.DEFAULT_GOAL := $(BIN)

CHISEL_DIR = ./chisel
CHISEL_OUT = $(BUILD_DIR)/chisel
SIM_DIR    = ./sim

# ---- 跑程序的选项 ----
PROG     ?= $(SIM_DIR)/progs/verify.hex # 跑哪个程序
CYCLES   ?= 32                          # 周期上限
DIFFTEST ?=                             # 非空就开对拍（和 old-minirvEMU 逐拍比）
TRACE    ?=                             # 非空就逐周期打印 PC / 指令

VERILATOR = verilator
VERILATOR_CFLAGS += -MMD --build -cc \
                    -O3 --x-assign fast --x-initial fast --noassert
# difftest.cpp 要 include 参考侧的 minirvEMU.h（verilator 在 obj_dir 里编译，要绝对路径）
VERILATOR_CFLAGS += -CFLAGS "-I$(abspath $(EMU_DIR))"

CXX      = g++
CXXFLAGS = -O2 -Wall

# 参考侧：old-minirvEMU（自带 main()，编译时改名，免得和仿真主程序打架）
EMU_DIR = ../old-minirvEMU
EMU_SRC = $(EMU_DIR)/minirvEMU.cpp
EMU_OBJ = $(abspath $(BUILD_DIR)/emu/minirvEMU.o)

# Chisel 源文件（RTL 的唯一真相）
CHISEL_SRCS = $(shell find $(CHISEL_DIR)/src/main/scala -name "*.scala")

# C++ 源文件：仿真主程序 + C 侧内存（DPI-C）+ ebreak 通知（DPI-C）+ 对拍
CSRCS = $(SIM_DIR)/sim_main.cpp $(SIM_DIR)/sim_mem.cpp $(SIM_DIR)/sim_halt.cpp \
        $(SIM_DIR)/difftest.cpp $(EMU_OBJ)

# Chisel 生成的 SystemVerilog（含黑盒的 inline Verilog）
VSRCS = $(wildcard $(CHISEL_OUT)/*.sv)

$(shell mkdir -p $(BUILD_DIR))

# ---------------------------------------------------------------------------
# 生成 RTL、编译仿真程序
# ---------------------------------------------------------------------------
# chisel-generate 只是 top.sv 的别名，方便单独生成 RTL。
# 编译仿真程序直接依赖 top.sv（而不是这个 phony 目标），
# 这样 RTL 没变就不会重编，AM 那边反复跑测试时才不用每次都等一遍 verilator。
chisel-generate: $(CHISEL_OUT)/top.sv

$(CHISEL_OUT)/top.sv: $(CHISEL_SRCS) \
                      $(CHISEL_DIR)/src/main/resources/SimMem.sv \
                      $(CHISEL_DIR)/src/main/resources/Halt.sv \
                      $(CHISEL_DIR)/build.sbt \
                      $(CHISEL_DIR)/project/build.properties
	mkdir -p $(CHISEL_OUT)
	cd $(CHISEL_DIR) && sbt -batch run
	test -f $(CHISEL_OUT)/top.sv

$(BIN): $(CHISEL_OUT)/top.sv $(CSRCS)
	@rm -rf $(OBJ_DIR)
	$(VERILATOR) $(VERILATOR_CFLAGS) \
		--top-module $(TOPNAME) $(VSRCS) $(CSRCS) \
		--Mdir $(OBJ_DIR) --exe -o $(BIN)

# 编译参考侧 old-minirvEMU：它的 main() 改名，避免和仿真主程序冲突
$(EMU_OBJ): $(EMU_SRC) $(EMU_DIR)/minirvEMU.h
	mkdir -p $(dir $@)
	$(CXX) $(CXXFLAGS) -Dmain=emu_main -c -o $@ $<

# ---------------------------------------------------------------------------
# 跑程序
# ---------------------------------------------------------------------------
run: $(BIN)
	$(BIN) --cycles $(CYCLES) $(if $(DIFFTEST),--difftest,) $(if $(TRACE),--trace,) $(PROG)

# ---------------------------------------------------------------------------
# 检查
# ---------------------------------------------------------------------------
lint: chisel-generate
	$(VERILATOR) --lint-only -Wall \
		-Wno-UNUSEDSIGNAL \
		--top-module $(TOPNAME) \
		$(VSRCS)

format:
	cd $(CHISEL_DIR) && sbt -batch scalafmtAll

checkformat:
	cd $(CHISEL_DIR) && sbt -batch scalafmtCheckAll

clean:
	rm -rf $(BUILD_DIR)

.PHONY: run chisel-generate lint format checkformat clean
```

为了方便在am-kernels/tests/cpu-tests/和riscv-tests/等目录下直接通过DIFFTEST、TRACE控制是否启动difftest和指令追踪，还需要修改 abstract-machine/scripts/platform/npc.mk 文件（那些应用程序测试目录中的Makefile都会包含该文件如果我们将ARCH设置为xxx-npc的话）。

```makefile
AM_SRCS := riscv/npc/start.S \
           riscv/npc/trm.c \
           riscv/npc/ioe.c \
           riscv/npc/timer.c \
           riscv/npc/input.c \
           riscv/npc/cte.c \
           riscv/npc/trap.S \
           platform/dummy/vme.c \
           platform/dummy/mpe.c

CFLAGS    += -fdata-sections -ffunction-sections
LDSCRIPTS += $(AM_HOME)/scripts/linker.ld
LDFLAGS   += --defsym=_pmem_start=0x80000000 --defsym=_entry_offset=0x0
LDFLAGS   += --gc-sections -e _start

NPC_DIR   = $(abspath $(AM_HOME)/../npc)
NPC_TOP   = $(NPC_DIR)/build/top
NPC_CYCLES = 10000000   # 跑测试的周期上限（npc 自己的默认 32 太小；npc 约 3000 万周期/秒）

MAINARGS_MAX_LEN = 64
MAINARGS_PLACEHOLDER = the_insert-arg_rule_in_Makefile_will_insert_mainargs_here
CFLAGS += -DMAINARGS_MAX_LEN=$(MAINARGS_MAX_LEN) -DMAINARGS_PLACEHOLDER=$(MAINARGS_PLACEHOLDER)

insert-arg: image
	@python $(AM_HOME)/tools/insert-arg.py $(IMAGE).bin $(MAINARGS_MAX_LEN) $(MAINARGS_PLACEHOLDER) "$(mainargs)"

image: image-dep
	@$(OBJDUMP) -d $(IMAGE).elf > $(IMAGE).txt
	@echo + OBJCOPY "->" $(IMAGE_REL).bin
	@$(OBJCOPY) -S --set-section-flags .bss=alloc,contents -O binary $(IMAGE).elf $(IMAGE).bin

# 在 npc 上跑这个测试：
#   1. 把 AM 编出来的镜像转成 npc 的 hex 格式（入口地址 + 每行一条 32 bit 指令）
#   2. 调 npc 自己的 Makefile 跑：构建、跑程序、判结果都在 npc 那边
#
# 加 DIFFTEST=1 就顺便和 old-minirvEMU 逐拍对拍（npc 的 --difftest 选项）：
#   make ARCH=minirv-npc DIFFTEST=1 run
# 加 TRACE=1 同理
run: image
	@ENTRY=$$(riscv64-unknown-elf-readelf -h $(IMAGE).elf | awk '/Entry point/{print $$4}'); \
	 { echo "@$$ENTRY"; hexdump -v -e '1/4 "%08x\n"' $(IMAGE).bin; } > $(IMAGE).hex; \
	$(MAKE) -C $(NPC_DIR) run PROG=$(IMAGE).hex CYCLES=$(NPC_CYCLES) \
	          DIFFTEST=$(DIFFTEST) TRACE=$(TRACE)

.PHONY: image insert-arg run
```

在dummy程序中测试一下difftest和trace：

```bash
xi@tanxi:~/ysyx/ysyx-project/am-kernels/tests/cpu-tests$ make ARCH=minirv-npc DIFFTEST=1 TRACE=1 ALL=wrong run
# Building wrong-run [minirv-npc]
# Building am-archive [minirv-npc]
# Building klib-archive [minirv-npc]
+ OBJCOPY -> build/wrong-minirv-npc.bin
[sim] 已加载程序镜像 /home/xi/ysyx/ysyx-project/am-kernels/tests/cpu-tests/build/wrong-minirv-npc.hex：36 条指令
[difftest] 程序     ：/home/xi/ysyx/ysyx-project/am-kernels/tests/cpu-tests/build/wrong-minirv-npc.hex
[difftest] 基址     ：0x80000000
[difftest] 参考侧   ：old-minirvEMU（内存 16MB，和 npc 一致）
[difftest] DUT 侧   ：npc（Chisel RTL）
[  1] pc=80000000 instr=00000413  x1=0x00000000 x10=0x00000000
[  2] pc=80000004 instr=80009137  x1=0x00000000 x10=0x00000000
[  3] pc=80000008 instr=00010113  x1=0x00000000 x10=0x00000000
[  4] pc=8000000c instr=800000b7  x1=0x80000000 x10=0x00000000
[  5] pc=80000010 instr=02008093  x1=0x80000020 x10=0x00000000
[  6] pc=80000014 instr=000080e7  x1=0x80000018 x10=0x00000000
[  7] pc=80000020 instr=ff410113  x1=0x80000018 x10=0x00000000
[  8] pc=80000024 instr=80000537  x1=0x80000018 x10=0x80000000
[  9] pc=80000028 instr=05050513  x1=0x80000018 x10=0x80000050
[ 10] pc=8000002c instr=00112423  x1=0x80000018 x10=0x80000050
[ 11] pc=80000030 instr=800000b7  x1=0x80000000 x10=0x80000050
[ 12] pc=80000034 instr=01808093  x1=0x80000018 x10=0x80000050
[ 13] pc=80000038 instr=000080e7  x1=0x8000003c x10=0x80000050
[ 14] pc=80000018 instr=00100513  x1=0x8000003c x10=0x00000001
[ 15] pc=8000001c instr=00008067  x1=0x8000003c x10=0x00000001
[ 16] pc=8000003c instr=00050513  x1=0x8000003c x10=0x00000001
NPC: hit EBREAK at PC = 0x80000040, a0 = 0x1
[ 17] pc=80000040 instr=00100073  x1=0x8000003c x10=0x00000001
[difftest] 两侧都在 PC = 0x80000040 的 ebreak 停机，共 17 拍
[difftest] PASS：17 拍全程一致（PC + 32 个寄存器）
HIT BAD TRAP
test list [1 item(s)]: wrong
[         wrong] PASS
```

使用difftest重新测试cpu-test和riscv-test：

```bash
xi@tanxi:~/ysyx/ysyx-project/am-kernels/tests/cpu-tests$ make ARCH=minirv-npc DIFFTEST=1  run
test list [36 item(s)]: goldbach add-longlong fib wanshu fact prime crc32 quick-sort sub-longlong bit max if-else sum switch shift load-store leap-year dummy min3 select-sort movsx wrong narcissistic recursion string bubble-sort mersenne div pascal hello-str mov-c matrix-mul to-lower-case unalign add mul-longlong
[      goldbach] PASS
[  add-longlong] PASS
[           fib] PASS
[        wanshu] PASS
[          fact] PASS
[         prime] PASS
[         crc32] PASS
[    quick-sort] PASS
[  sub-longlong] PASS
[           bit] PASS
[           max] PASS
[       if-else] PASS
[           sum] PASS
[        switch] PASS
[         shift] PASS
[    load-store] PASS
[     leap-year] PASS
[         dummy] PASS
[          min3] PASS
[   select-sort] PASS
[         movsx] PASS
[         wrong] PASS
[  narcissistic] PASS
[     recursion] PASS
[        string] PASS
[   bubble-sort] PASS
[      mersenne] PASS
[           div] PASS
[        pascal] PASS
[     hello-str] PASS
[         mov-c] PASS
[    matrix-mul] PASS
[ to-lower-case] PASS
[       unalign] PASS
[           add] PASS
[  mul-longlong] PASS
```

```bash
xi@tanxi:~/ysyx/ysyx-project/riscv-tests$ make ARCH=minirv-npc DIFFTEST=1 run TEST_ISA=i
test list [38 item(s)]: add addi and andi auipc beq bge bgeu blt bltu bne jal jalr lb lbu lh lhu lui lw or ori sb sh simple sll slli slt slti sltiu sltu sra srai srl srli sub sw xor xori
[           add] PASS
[          addi] PASS
[           and] PASS
[          andi] PASS
[         auipc] PASS
[           beq] PASS
[           bge] PASS
[          bgeu] PASS
[           blt] PASS
[          bltu] PASS
[           bne] PASS
[           jal] PASS
[          jalr] PASS
[            lb] PASS
[           lbu] PASS
[            lh] PASS
[           lhu] PASS
[           lui] PASS
[            lw] PASS
[            or] PASS
[           ori] PASS
[            sb] PASS
[            sh] PASS
[        simple] PASS
[           sll] PASS
[          slli] PASS
[           slt] PASS
[          slti] PASS
[         sltiu] PASS
[          sltu] PASS
[           sra] PASS
[          srai] PASS
[           srl] PASS
[          srli] PASS
[           sub] PASS
[            sw] PASS
[           xor] PASS
[          xori] PASS
```

# **五、添加UART支持字符输出**

在RISC-V中, 输入输出通过"内存映射I/O"(Memory-mapped I/O)的方式实现。具体地, RISC-V提供了**load指令**和**store指令**, 这两条指令既可以访问存储器, 也可以访问外部设备，这取决于所使用的地址。

## UART简介

> **UART（Universal Asynchronous Receiver/Transmitter，通用异步收发器）**是一种**串行通信协议**，用于**两个设备**之间**传输数据**。
> 

**应用场景：**

- MCU ↔ PC串口
- MCU ↔ GPS
- MCU ↔ 4G模块
- MCU ↔ 蓝牙模块
- 芯片调试打印日志

**最基本的UART的硬件连接**

- TX表示发送端
- RX表示接收端

```bash
设备A              设备B

TX  -------------> RX

RX  <------------- TX

GND ------------- GND
```

注意**UART是异步的**，即使用UART通信的双方之间无需使用同步时钟驱动。

通信双方在通信之前必须约定好：**波特率（每秒传输多少bit）、数据位数、校验方式和停止位**

**发送规则**（以发送0x55为例）：

- 初始情况下TX保持为1，表示发送端空闲
- 假设要发送的数据为0x55，其二进制表示为01010101
- 按低位先发送（LSB first）的原则

因此该数据的发送顺序应当是：

```bash
bit0 bit1 bit2 bit3 bit4 bit5 bit6 bit7

 1    0    1    0    1    0    1    0
```

发送端会先发送一个起始位0，通知接收端开始接受数据。

```bash
|start| bit0 bit1 bit2 bit3 bit4 bit5 bit6 bit7 | stop |
|  0  |  1    0    1    0    1    0    1    0   |   1  |
```

注意：

- 接收端靠电平的变化来判断数据的起始位
- 接收端不靠电平来判断结束位，而是通过预先设置好的数据位数确定结束位

> 这里仅做一个简单的介绍，就不深入UART的更多细节了。
> 

## 添加UART行为模型

![image.png](/images/posts/ysyx-e6/image%2013.png)

### 在仿真端支持输出操作

前面我们已经提到了，在RISC-V中使用MMIO的方式访问外部设备。这里我们假设UART输出端口寄存器的地址为0x10000000，任何对该地址的写操作都会将数据通过UART输出到设备。

修改仿真程序中的 mem_write() 函数，当发现地址为 0x10000000 时，调用 fputc() 函数输出数据字符数据。

> 这里的 fputc() 来自AM中的klib，这是在平台的抽象之上实现的一组库函数（类似gnu的库函数），在构建时AM会根据目标平台，灵活地调用底层平台提供的支持来实现这些库函数，所以klib是平台无关的，这使得上层的应用程序在调用klib中的函数进行I/O、内存分配等操作时无需考虑平台的实现细节，实现了应用程序与平台实现之间的解耦。
> 

```cpp
// ---------------- DPI-C 导出函数（RTL 侧 import "DPI-C" 声明）----------------

#define SERIAL_PORT 0x10000000

// 读 len 个字节（小端），返回值零扩展
extern "C" unsigned int mem_read(unsigned int addr, unsigned int len) {
	// 读UART串口，直接返回0
  if ((uint32_t)addr == SERIAL_PORT) return 0;

  unsigned int v = 0;
  for (unsigned i = 0; i < len && i < 8; i++) {
    v |= (unsigned int)pmem[(addr + i) & MEM_MASK] << (8 * i);
  }
  return v;
}

// 把 data 的低 len 个字节写到 addr（小端）
extern "C" void mem_write(unsigned int addr, unsigned int data, unsigned int len) {
  // 写UART串口，将数据通过klib中的putc输出出去
  if (addr == SERIAL_PORT) {
    putc(data & 0xff, stderr);
    return ;
  }
  
  for (unsigned i = 0; i < len && i < 8; i++) {
    pmem[(addr + i) & MEM_MASK] = (uint8_t)(data >> (8 * i));
  }
}
```

### 在AM中添加对输出字符的支持

> 其中的逻辑如下：在AM中为应用程序提供putch函数，在putch中我们将要输出的字符写入地址0x10000000处，在npc仿真程序中看到了对这块地址的写入操作时会将其输出到终端。
> 

在 abstract-machine/am/src/riscv/npc/trm.c 中实现putch()函数：

```cpp
#define SERIAL_PORT 0x10000000
void putch(char ch) {
  // UART数据寄存器(0x10000000)的MMIO写, 由npc仿真环境的行为模型打印; 
  // volatile防止编译器删除这次无读侧的写
  *(volatile char *)SERIAL_PORT = ch;
}
```

在 minirvEMU 中，对于目标地址为串口地址0x10000000的store指令，忽略它即可。

```cpp
#define SERIAL_PORT 0x10000000

void inst_cycle() {
    ......
	  else if (opcode == 0x03) {
        // load
        uint32_t addr = R[rs1] + imm_I;
        if (addr == SERIAL_PORT) {
		        // 参考侧与NPC同步 
            if (rd != 0) R[rd] = 0;
        }
    } else if (opcode == 0x23) {
        // store
        uint32_t addr = R[rs1] + imm_S;
        if (addr == SERIAL_PORT) {
            // UART 写: NPC 仿真侧负责打印, 参考模型不碰内存
        }
        ......
    }
    
    ......
}
```

测试一下，先在native上运行该程序：

```bash
xi@tanxi:~/ysyx/ysyx-project/am-kernels/kernels/hello$ make ARCH=native run
# Building hello-run [native]
+ CC hello.c
# Building am-archive [native]
# Building klib-archive [native]
+ CC src/stdio.c
+ AR -> build/klib-native.a
# Creating image [native]
+ LD -> build/hello-native.elf
/home/xi/ysyx/ysyx-project/am-kernels/kernels/hello/build/hello-native.elf
Hello, AbstractMachine!
mainargs = ''.
Exit code = 00h
```

再在minirv-npc上运行：

```bash
xi@tanxi:~/ysyx/ysyx-project/am-kernels/kernels/hello$ make ARCH=minirv-npc run
# Building hello-run [minirv-npc]
# Building am-archive [minirv-npc]
+ CC src/riscv/npc/trm.c
+ AR -> build/am-minirv-npc.a
# Building klib-archive [minirv-npc]
# Creating image [minirv-npc]
+ LD -> build/hello-minirv-npc.elf
+ OBJCOPY -> build/hello-minirv-npc.bin
make[1]: Entering directory '/home/xi/ysyx/ysyx-project/npc'
/home/xi/ysyx/ysyx-project/npc/build/top --cycles 10000000   /home/xi/ysyx/ysyx-project/am-kernels/kernels/hello/build/hello-minirv-npc.hex
[sim] 已加载程序镜像 /home/xi/ysyx/ysyx-project/am-kernels/kernels/hello/build/hello-minirv-npc.hex：74240 条指令
Hello, AbstractMachine!
mainargs = 'the_insert-arg_rule_in_Makefile_will_insert_mainargs_here'.
NPC: hit EBREAK at PC = 0x800003d8, a0 = 0x0
HIT GOOD TRAP
make[1]: Leaving directory '/home/xi/ysyx/ysyx-project/npc'
```

可以看到运行在我们的npc处理器上的hello程序输出了和native相同的字符串。

### 运行benchmark

![image.png](/images/posts/ysyx-e6/image%2014.png)

当我运行这个测试时，发现panic说**abstract-machine/klib/src/**下的**stdio.c**和**string.c**中的函数未实现，现在我们需要先实现一下这些库函数。

### 实现string.c

这部分需要实现如下接口：

```c
// string.h
void  *memset    (void *s, int c, size_t n);
void  *memcpy    (void *dst, const void *src, size_t n);
void  *memmove   (void *dst, const void *src, size_t n);
void  *memchr    (const void *s, int c, size_t n);
int    memcmp    (const void *s1, const void *s2, size_t n);
size_t strlen    (const char *s);
char  *strcat    (char *dst, const char *src);
char  *strcpy    (char *dst, const char *src);
char  *strncpy   (char *dst, const char *src, size_t n);
int    strcmp    (const char *s1, const char *s2);
int    strncmp   (const char *s1, const char *s2, size_t n);
char  *strchr    (const char *s, int c);
char  *strrchr   (const char *s, int c);
char  *strstr    (const char *haystack, const char *needle);
size_t strspn    (const char *s, const char *accept);
char  *strpbrk   (const char *s, const char *accept);
int    strcoll   (const char *s1, const char *s2);
```

具体实现不展示了。

### 实现stdio.c

```c
int    printf    (const char *format, ...);
int    vprintf   (const char *fmt, va_list ap);
int    sprintf   (char *str, const char *format, ...);
int    snprintf  (char *str, size_t size, const char *format, ...);
int    vsprintf  (char *str, const char *format, va_list ap);
int    vsnprintf (char *str, size_t size, const char *format, va_list ap);
int    vsscanf   (const char *str, const char *fmt, va_list ap);
int    sscanf    (const char *str, const char *fmt, ...);
```

具体实现见**这一篇文章（写一篇博客解释printf的实现）**。

> **printf** 的本质是：**把格式化字符串和参数进行解析、拼接成最终字符串，然后通过系统调用把字符逐个写到标准输出**。
> 

在 am-kernels/benchmarks/coremark 中运行测试：

```bash
xi@tanxi:~/ysyx/ysyx-project/am-kernels/benchmarks/coremark$ make ARCH=minirv-npc run mainargs=test
# Building coremark-run [minirv-npc]
# Building am-archive [minirv-npc]
# Building klib-archive [minirv-npc]
# Creating image [minirv-npc]
+ LD -> build/coremark-minirv-npc.elf
+ OBJCOPY -> build/coremark-minirv-npc.bin
make[1]: Entering directory '/home/xi/ysyx/ysyx-project/npc'
/home/xi/ysyx/ysyx-project/npc/build/top --cycles 10000000   /home/xi/ysyx/ysyx-project/am-kernels/benchmarks/coremark/build/coremark-minirv-npc.hex
[sim] 已加载程序镜像 /home/xi/ysyx/ysyx-project/am-kernels/benchmarks/coremark/build/coremark-minirv-npc.hex：108476 条指令
Running CoreMark for 2 iterations
[sim] 程序没有执行到 ebreak，跑满 10000000 个周期就停了
HIT BAD TRAP
make[1]: *** [Makefile:93: run] Error 1
make[1]: Leaving directory '/home/xi/ysyx/ysyx-project/npc'
make: *** [/home/xi/ysyx/ysyx-project/abstract-machine/scripts/platform/npc.mk:39: run] Error 2
```

出现上述问题是因为我们在npc.mk中设置为最大cycle数不足，将其调大一点：

```makefile
# abstract-machine/scripts/platform/npc.mk
NPC_CYCLES = 1000000000  
```

重新测试：

```bash
xi@tanxi:~/ysyx/ysyx-project/am-kernels/benchmarks/coremark$ make ARCH=minirv-npc run mainargs=test
# Building coremark-run [minirv-npc]
# Building am-archive [minirv-npc]
# Building klib-archive [minirv-npc]
+ OBJCOPY -> build/coremark-minirv-npc.bin
make[1]: Entering directory '/home/xi/ysyx/ysyx-project/npc'

/home/xi/ysyx/ysyx-project/npc/build/top --cycles 1000000000   /home/xi/ysyx/ysyx-project/am-kernels/benchmarks/coremark/build/coremark-minirv-npc.hex
[sim] 已加载程序镜像 /home/xi/ysyx/ysyx-project/am-kernels/benchmarks/coremark/build/coremark-minirv-npc.hex：108476 条指令
Running CoreMark for 2 iterations
2K performance run parameters for coremark.
CoreMark Size    : 666
Total time (ms)  : 0
Iterations       : 2
Compiler version : GCC13.2.0
seedcrc          : 0xe9f5
[0]crclist       : 0xe714
[0]crcmatrix     : 0x1fd7
[0]crcstate      : 0x8e3a
[0]crcfinal      : 0x72be
Finised in 0 ms.
==================================================
CoreMark PASS       0 Marks
                vs. 100000 Marks (i7-7700K @ 4.20GHz)
NPC: hit EBREAK at PC = 0x80016b00, a0 = 0x0
HIT GOOD TRAP
```

## 运行LLaMa大模型

![image.png](/images/posts/ysyx-e6/image%2015.png)

运行测试，发现未实现malloc等函数，报出错误。

### 实现malloc

设计思路：采用**隐式空闲链表**管理堆内存

- **每个内存块前面都有一个 Header**（元数据）
- 空闲块的 Header 里记录了 **下一空闲块的指针**，串成**空闲链表**
- 分配时从链表里找够大的块，切一块给用户

```c
// K&R style free-list allocator, carved from the heap area exported by AM TRM
typedef long Align;
union header {
  struct {
    union header *ptr; // next free block in the list
    size_t size;       // size of this block, in units of header
  } s;
  Align x;             // force alignment of allocations
};
typedef union header Header;

static Header base;           // empty list to get started
static Header *freep = NULL;  // start of free list
static char *heap_brk = NULL; // bump pointer over the heap area

#define NALLOC 1024 // minimum units to request from the heap

// 向堆区索要内存
static Header *morecore(size_t nu) {
  if (heap_brk == NULL) heap_brk = heap.start;
  if (nu < NALLOC) nu = NALLOC;
  size_t bytes = nu * sizeof(Header);
  if (bytes / sizeof(Header) != nu ||
      (size_t)((char *)heap.end - heap_brk) < bytes) {
    return NULL; // out of memory
  }
  Header *up = (Header *)heap_brk;
  heap_brk += bytes;
  up->s.size = nu;
  free((void *)(up + 1));
  return freep;
}

void *malloc(size_t size) {
  if (size == 0) return NULL;
  
  // 需要分配的实际空间为 size 加上 Header所需的内容，按Header size向上取整
  size_t nunits = (size + sizeof(Header) - 1) / sizeof(Header) + 1;
  if (freep == NULL) { // initialize the free list
    base.s.ptr = freep = &base;
    base.s.size = 0;
  }

  Header *prev = freep, *p;
  for (p = prev->s.ptr; ; prev = p, p = p->s.ptr) {
    if (p->s.size >= nunits) { // big enough
      if (p->s.size == nunits) {
        prev->s.ptr = p->s.ptr; // exact fit
      } else { // allocate tail end
        p->s.size -= nunits;
        p += p->s.size;
        p->s.size = nunits;
      }
      freep = prev;
      return (void *)(p + 1);
    }

    if (p == freep) { // wrapped around the free list
      if ((p = morecore(nunits)) == NULL) return NULL;
    }
  }
}
```

### 在NPC上运行大模型

```bash
xi@tanxi:~/ysyx/ysyx-project/archbench/bench/202.llama2$ make ARCH=minirv-npc run mainargs=test
# Building llama2-run [minirv-npc]
# Building libbench-archive [minirv-npc]
python /home/xi/ysyx/ysyx-project/abstract-machine/tools/gen-ramdisk.py /home/xi/ysyx/ysyx-project/archbench/bench/202.llama2/build/llama2.ramdisk.c am.filelist
+ CC /home/xi/ysyx/ysyx-project/archbench/bench/202.llama2/build/llama2.ramdisk.c
# Building am-archive [minirv-npc]
# Building klib-archive [minirv-npc]
# Creating image [minirv-npc]
+ LD -> build/llama2-minirv-npc.elf
+ OBJCOPY -> build/llama2-minirv-npc.bin
mainargs=test
make[1]: Entering directory '/home/xi/ysyx/ysyx-project/npc'
/home/xi/ysyx/ysyx-project/npc/build/top --cycles 1000000000   /home/xi/ysyx/ysyx-project/archbench/bench/202.llama2/build/llama2-minirv-npc.hex
[sim] 已加载程序镜像 /home/xi/ysyx/ysyx-project/archbench/bench/202.llama2/build/llama2-minirv-npc.hex：134059 条指令
Start...
Once
==================================================
[RESULT] PASS with min time:   0:00:00.000001 (1 us)

Scored time:   0:00:00.000001 (1 us)
Total  time:   0:00:00.000000 (0 us)
NPC: hit EBREAK at PC = 0x8001e424, a0 = 0x0
HIT GOOD TRAP
make[1]: Leaving directory '/home/xi/ysyx/ysyx-project/npc'

xi@tanxi:~/ysyx/ysyx-project/archbench/bench/202.llama2$ make ARCH=minirv-npc run mainargs=train
# Building llama2-run [minirv-npc]
# Building libbench-archive [minirv-npc]
python /home/xi/ysyx/ysyx-project/abstract-machine/tools/gen-ramdisk.py /home/xi/ysyx/ysyx-project/archbench/bench/202.llama2/build/llama2.ramdisk.c am.filelist
+ CC /home/xi/ysyx/ysyx-project/archbench/bench/202.llama2/build/llama2.ramdisk.c
# Building am-archive [minirv-npc]
# Building klib-archive [minirv-npc]
# Creating image [minirv-npc]
+ LD -> build/llama2-minirv-npc.elf
+ OBJCOPY -> build/llama2-minirv-npc.bin
mainargs=train
make[1]: Entering directory '/home/xi/ysyx/ysyx-project/npc'
/home/xi/ysyx/ysyx-project/npc/build/top --cycles 100000000000   /home/xi/ysyx/ysyx-project/archbench/bench/202.llama2/build/llama2-minirv-npc.hex
[sim] 已加载程序镜像 /home/xi/ysyx/ysyx-project/archbench/bench/202.llama2/build/llama2-minirv-npc.hex：148843 条指令
Start...
Once upon a time, there was a little girl named Lily.
achieved tok/s: can not measure due to finishing in 0.1s
==================================================
[RESULT] PASS with min time:   0:00:00.000001 (1 us)
       207000000 Marks
  vs.    1000000 Marks @ AMD Ryzen(TM) 9 7950X3D
Scored time:   0:00:00.000001 (1 us)
Total  time:   0:00:00.000000 (0 us)
NPC: hit EBREAK at PC = 0x8001e424, a0 = 0x0
HIT GOOD TRAP
make[1]: Leaving directory '/home/xi/ysyx/ysyx-project/npc'
```

### 运行benchmark测试

![image.png](/images/posts/ysyx-e6/image%2016.png)

按照讲义的要求，运行下面的测试：

```bash
cd archbench/scripts
bash run.sh ARCH=minirv-npc mainargs=test
```

这个脚本会运行archbench/bench/目录下的多个测试程序，结果如下：

```bash
======== ARCH=minirv-npc mainargs=test =======

100.blockchain :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 0.52 s
101.igemm      :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 0.15 s
102.queen      :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 0.25 s
103.dinic      :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 0.51 s
104.malloc     :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 0.50 s
105.bf         :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 0.62 s
106.qsort      :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 0.37 s
107.stream     :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 0.27 s
108.ntt        :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 1.10 s
200.genann     :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 7.88 s
201.jpeg       :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 0.51 s
202.llama2     :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 6.93 s
203.rsa        :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 2.28 s
204.hypergraph :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 0.34 s
300.bzip3      :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 9.75 s
301.gsim       :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 0.58 s
302.lua        :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 1.16 s
303.cproc      :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 0.49 s
304.mp3        :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 5.82 s
305.h264       :  [RESULT] PASS with min time:   0:00:00.000001 (1 us)                                     [WALL] 0.61 s
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
GEOMEAN:       0 Marks
   MEAN:       0 Marks
   vs.   1000000 Marks @ AMD Ryzen(TM) 9 7950X3D
```

这里运行minirv-npc的marks均为0。

## 为UART添加状态寄存器

> 所谓状态寄存器，其实就是将地址0x10000004用于表示UART设备状态。
> 

![image.png](/images/posts/ysyx-e6/image%2017.png)

对于真实的UART来说, 在输出一个字符之前, 还需要检查设备的状态是否就绪。如果在UART的状态未就绪的时候就输出字符, 该字符将会丢失。

这需要UART维护一个状态寄存器，修改npc/sim/sim_mem.cpp中的mem_read实现，添加对UART状态寄存器的地址0x10000004的访问支持，此外为了模拟真实UART状态寄存器，采用随机数生成的方式控制设备就绪的概率。

```c
#define SERIAL_PORT 0x10000000
#define UART_STATUS 0x10000004

extern "C" unsigned int mem_read(unsigned int addr, unsigned int len) {
  if ((uint32_t)addr == SERIAL_PORT) return 0;

  if ((uint32_t)addr == UART_STATUS) {  // 读出UART状态
    return (rand() & 0x7) == 0 ? 1 : 0;  // 就绪概率为12.5%
  }
  
  unsigned int v = 0;
  for (unsigned i = 0; i < len && i < 8; i++) {
    v |= (unsigned int)pmem[(addr + i) & MEM_MASK] << (8 * i);
  }
  return v;
}
```

上述行为模型约定, 可以从地址`0x10000004`读出UART的状态.。状态寄存器的行为由随机数模拟, 有 12.5% 的概率读出`1`, 表示就绪。

修改am的trm.c中的putch函数，添加对UART状态查询的支持：

```c
// UART 寄存器组（npc 仿真环境的 UART 行为模型，见 npc/sim/sim_mem.cpp）
//   0x10000000  THR    写 = 发一个字节（由 npc 仿真环境打印）
//   0x10000004  STATUS 读 = 1 表示发送保持寄存器空（可以发下一个字节）
#define UART_BASE   0x10000000
#define UART_THR    (UART_BASE + 0x0)
#define UART_STATUS (UART_BASE + 0x4)

void putch(char ch) {
  // 轮询 STATUS 等设备就绪：STATUS 读回来是 1 才表示可以发下一个字节
  while (*(volatile uint32_t *)UART_STATUS == 0);

  // 写THR发送字节, 由npc仿真环境的行为模型打印; volatile防止编译器删除这次无读侧的写
  *(volatile uint8_t *)UART_THR = ch;
}
```

至于minirvEMU也需要进行修改，放到后面做。

# **六、添加时钟支持计时功能**

## 实现计时功能

> 同理，用地址 0x20000000 和地址 0x20000004 表示一个8字节的时钟。
> 

首先在npc的main.c中添加对时钟的支持，我的思路是通过两个时间变量start和end记录起始时间，在npc加载完程序后记录下start，在调用get_time时记录下end，并返回从仿真开始所经过的时间, 单位为微秒。

先实现**get_time**函数：

```c
struct timeval start,end;

unsigned long long get_time() {
    // 返回从仿真开始所经过的时间, 单位为微秒
    unsigned long long time;

    gettimeofday(&end, NULL);
		
    time=(end.tv_sec-start.tv_sec)*1000000
        +(end.tv_usec-start.tv_usec);

    return time;
}
```

让时钟通过MMIO的方式供程序访问，修改**pmem_read**函数，使其支持对时钟的访问：

```c
// ---------------------------------------------------------------------------
// 时钟寄存器（0x20000000 起的 8 字节）
//
//   0x20000000  读 = 仿真开始至今的微秒数的低 32 位
//   0x20000004  读 = 高的 32 位
//   写 = 无效（只读寄存器）
//
// 这 8 字节整体看成一个 64 位计数器，按地址偏移取对应字节，
// 这样字节/半字/字的访问都是对的。
// 时间由 get_time() 给（墙钟，微秒），见 sim_main.cpp。
// ---------------------------------------------------------------------------
#define CLOCK_BASE 0x20000000
#define CLOCK_SIZE 8

// ---------------- DPI-C 导出函数（RTL 侧 import "DPI-C" 声明）----------------
extern "C" unsigned int mem_read(unsigned int addr, unsigned int len) {
  if ((uint32_t)addr == UART_THR) return 0;

  if ((uint32_t)addr == UART_STATUS) {  // 读出UART状态
    return (uart_busy == 0) ? 1u : 0u;
  }
  
  // 时钟寄存器：8 字节的 64 位微秒计数，按偏移取字节
  if ((uint32_t)addr >= CLOCK_BASE && (uint32_t)addr < CLOCK_BASE + CLOCK_SIZE) {
    unsigned long long t = get_time();
    unsigned int off = (unsigned int)((addr - CLOCK_BASE) & (CLOCK_SIZE - 1));
    unsigned int v = (unsigned int)(t >> (off * 8));
    if (len == 1) v &= 0xffu;
    else if (len == 2) v &= 0xffffu;
    return v;
  }
	
  unsigned int v = 0;
  for (unsigned i = 0; i < len && i < 8; i++) {
    v |= (unsigned int)pmem[(addr + i) & MEM_MASK] << (8 * i);
  }
  return v;
}
```

![image.png](/images/posts/ysyx-e6/image%2018.png)

我们知道时间信息被存放在内存地址0x20000000处（小端法），现在修改**timer.c**中的 **__am_timer_uptime**函数，从内存地址0x20000000处获取时间数据。

```c
void __am_timer_uptime(AM_TIMER_UPTIME_T *uptime) {
  uptime->us = *(volatile uint32_t *)0x20000000;
}
```

实现该函数后，我们就可以在应用程序中使用该函数来获取从程序启动开始到现在所经过的微秒数。

现在为了让DiffTest也能通过，还需要修改minirvEMU，使其也支持时钟和状态访问。

我的思路：

- 为了保持同步，每当npc仿真程序遇到对UART状态和时间信息的访问，就将其传递给minirvEMU
- 在minirvEMU中遇到对这些端口的访问时不能直接访问内存，而是访问存储这些信息的全局变量

在minirvEMU.cpp中定义两个全局变量dev_uart_status和dev_clock，分别用于存储UART状态寄存器和时钟：

```cpp
extern "C" {
uint32_t dev_uart_status = 1; // UART STATUS：1 = 就绪
uint64_t dev_clock = 0;       // 时钟寄存器（64 位微秒）
}

// 读时钟寄存器里的一个字节
static unsigned char clock_byte(unsigned int off) {
    return (unsigned char)(dev_clock >> (off * 8));
}
```

重新修改npc/sim/sim_mem.cpp，引入定义在minrvEMU中的两个全局变量dev_uart_status和dev_clock，当npc访问到UART状态寄存器和时钟时，更新这两个全局变量的值，将这些信息其同步给minirvEMU。

```cpp
// ---------------------------------------------------------------------------
// UART 寄存器组（0x10000000 起的 8 字节）
//
//   0x10000000  THR    写 = 发一个字节（这里打印到 stderr）；读 = 0
//   0x10000004  STATUS 读 = 1 表示发送保持寄存器空（可以发下一个字节）
//
// 这里 STATUS 恒为 1（永远就绪）：等以后把处理器接进 SoC，UART 状态由
// SoC 上的真实寄存器提供，再把它换掉。
//
// 恒就绪也是对拍的要求：两边"等 UART"等的拍数必须一样，
// 否则逐拍锁步的对拍从第一次 putch 就错位了。
// ---------------------------------------------------------------------------
#define UART_THR 0x10000000
#define UART_STATUS 0x10000004

// ---------------------------------------------------------------------------
// 时钟寄存器（0x20000000 起的 8 字节）
//
//   0x20000000  读 = 时间的低 32 位
//   0x20000004  读 = 时间的高 32 位
//   写 = 无效（只读寄存器）
//
// 这 8 字节整体看成一个 64 位计数器，按地址偏移取对应字节，
// 这样字节/半字/字的访问都是对的。
// ---------------------------------------------------------------------------
#define CLOCK_BASE 0x20000000
#define CLOCK_SIZE 8

// ---------------------------------------------------------------------------
// 设备寄存器的共享值：npc 侧算出值写进这里，参考侧 old-minirvEMU 直接读。
//
// 为什么不让两边各自算：npc 侧是组合读，一拍里 mem_read 可能被调用多次，
// 而且"读的时刻"和参考侧执行同一条指令的时刻差着拍（实测差 1 拍）。
// 两边各自算时间/状态，算出来的值就会差几拍，对拍立刻分歧。
// 由 npc 侧算一次、参考侧照抄，两边看到的就永远一致。
//
// difftest 的执行顺序是 npc 先、参考侧后，所以参考侧读到的
// 一定是 npc 侧为同一条指令算出来的值。
// ---------------------------------------------------------------------------
// 定义在参考侧 old-minirvEMU.cpp（那边单独编译时也有），这边只引用
extern "C" {
extern uint32_t dev_uart_status; // UART STATUS：1 = 就绪
extern uint64_t dev_clock;       // 时钟寄存器（64 位微秒）
}

// 当前时间（微秒）
static unsigned long long clock_now() { return get_time(); }

// ---------------- DPI-C 导出函数（RTL 侧 import "DPI-C" 声明）----------------

// 读 len 个字节（小端），返回值零扩展
extern "C" unsigned int mem_read(unsigned int addr, unsigned int len) {
  if ((uint32_t)addr == UART_THR) return 0;

  if ((uint32_t)addr == UART_STATUS) {  // 读出UART状态：恒为就绪
    dev_uart_status = 1u;               // 以后接了 SoC 就改成读 SoC 的真实状态
    return dev_uart_status;
  }
  
		// 时钟寄存器：0x20000000 读出时间的低 32 位，0x20000004 读出高 32 位
	  // 读别的宽度时按所属的那个 32 位寄存器算（时钟是按 word 访问的寄存器）
	  if ((uint32_t)addr >= CLOCK_BASE && (uint32_t)addr < CLOCK_BASE + CLOCK_SIZE) {
    dev_clock = clock_now(); // 算一次，参考侧直接用这个值
    uint32_t w = ((uint32_t)addr < CLOCK_BASE + 4) ? (uint32_t)dev_clock
                                                    : (uint32_t)(dev_clock >> 32);
    unsigned int v = w;
    if (len == 1) v &= 0xffu;
    else if (len == 2) v &= 0xffffu;
    return v;
  }

  unsigned int v = 0;
  for (unsigned i = 0; i < len && i < 8; i++) {
    v |= (unsigned int)pmem[(addr + i) & MEM_MASK] << (8 * i);
  }
  return v;
}

// 把 data 的低 len 个字节写到 addr（小端）
extern "C" void mem_write(unsigned int addr, unsigned int data, unsigned int len) {
  // 写入UART
  if (addr == UART_THR) {
    putc(data & 0xff, stderr);
    return;
  }

  // 时钟寄存器只读，写入直接丢掉（别写进内存）
  if ((uint32_t)addr >= CLOCK_BASE && (uint32_t)addr < CLOCK_BASE + CLOCK_SIZE) return;
  
  for (unsigned i = 0; i < len && i < 8; i++) {
    pmem[(addr + i) & MEM_MASK] = (uint8_t)(data >> (8 * i));
  }
}
```

还需要修改minirvEMU的指令循环中对load指令的处理，当遇到目的地址为UART状态寄存器和时间寄存器时，通过前面定义的两个全局变量获取UART状态和时钟信息：

```c
void inst_cycle() {
    ......
    else if (opcode == 0x03) {
        // load
        uint32_t addr = R[rs1] + imm_I;
        if (addr == SERIAL_PORT) {
             // UART: NPC 仿真侧打印, 参考模型不回数据, 按 0 处理
             if (rd != 0) R[rd] = 0;
        } else if (addr == UART_STATUS) {
             // UART STATUS：值由 npc 侧算好放在 dev_uart_status（恒为就绪）
             if (rd != 0) R[rd] = dev_uart_status;
        }else {
            uint32_t result = 0;
            if (addr >= CLOCK_BASE && addr < CLOCK_BASE + CLOCK_SIZE) {
                // 时钟寄存器：0x20000000 = 低 32 位，0x20000004 = 高 32 位
                // 值由 npc 侧算好放在 dev_clock 里
                uint32_t w = (addr < CLOCK_BASE + 4) ? (uint32_t)dev_clock
                                                     : (uint32_t)(dev_clock >> 32);
            }
        }
    }
    ......
}
```

测试一下，可以看到每隔一秒输出了一行内容，就没有问题了。

```bash
xi@tanxi:~/ysyx-project/am-kernels/tests/am-tests$ make ARCH=minirv-npc run mainargs=t
......
[sim] 已加载程序镜像 /home/xi/ysyx/ysyx-project/am-kernels/tests/am-tests/build/amtest-minirv-npc.hex：242555 条指令
1900-0-0 00:00:00 GMT (1 second).
1900-0-0 00:00:00 GMT (2 seconds).
1900-0-0 00:00:00 GMT (3 seconds).
1900-0-0 00:00:00 GMT (4 seconds).
1900-0-0 00:00:00 GMT (5 seconds).
1900-0-0 00:00:00 GMT (6 seconds).
```

## 测试效果

![image.png](/images/posts/ysyx-e6/image%2019.png)

```bash
xi@tanxi:~/ysyx/ysyx-project/am-kernels/benchmarks/coremark$ make ARCH=minirv-npc run mainargs=test
# Building coremark-run [minirv-npc]
# Building am-archive [minirv-npc]
# Building klib-archive [minirv-npc]
+ OBJCOPY -> build/coremark-minirv-npc.bin
mainargs=test
make[1]: Entering directory '/home/xi/ysyx/ysyx-project/npc'
/home/xi/ysyx/ysyx-project/npc/build/top --cycles 100000000000   /home/xi/ysyx/ysyx-project/am-kernels/benchmarks/coremark/build/coremark-minirv-npc.hex
[sim] 已加载程序镜像 /home/xi/ysyx/ysyx-project/am-kernels/benchmarks/coremark/build/coremark-minirv-npc.hex：108540 条指令
Running CoreMark for 2 iterations
2K performance run parameters for coremark.
CoreMark Size    : 666
Total time (ms)  : 4050
Iterations       : 2
Compiler version : GCC13.2.0
seedcrc          : 0xe9f5
[0]crclist       : 0xe714
[0]crcmatrix     : 0x1fd7
[0]crcstate      : 0x8e3a
[0]crcfinal      : 0x72be
Finised in 4050 ms.
==================================================
CoreMark PASS       1 Marks
                vs. 100000 Marks (i7-7700K @ 4.20GHz)
NPC: hit EBREAK at PC = 0x80016b98, a0 = 0x0
HIT GOOD TRAP
```

```bash
xi@tanxi:~/ysyx/ysyx-project/archbench/scripts$ bash run.sh ARCH=minirv-npc mainargs=test
======== ARCH=minirv-npc mainargs=test =======

100.blockchain :  [RESULT] PASS with min time:   0:00:00.382181 (382181 us)                                [WALL] 0.57 s
101.igemm      :  [RESULT] PASS with min time:   0:00:00.004753 (4753 us)                                  [WALL] 0.18 s
102.queen      :  [RESULT] PASS with min time:   0:00:00.135811 (135811 us)                                [WALL] 0.30 s
103.dinic      :  [RESULT] PASS with min time:   0:00:00.017888 (17888 us)                                 [WALL] 0.57 s
104.malloc     :  [RESULT] PASS with min time:   0:00:00.029616 (29616 us)                                 [WALL] 0.56 s
105.bf         :  [RESULT] PASS with min time:   0:00:00.051965 (51965 us)                                 [WALL] 0.80 s
106.qsort      :  [RESULT] PASS with min time:   0:00:00.013907 (13907 us)                                 [WALL] 0.45 s
107.stream     :  [RESULT] PASS with min time:   0:00:00.027872 (27872 us)                                 [WALL] 0.32 s
108.ntt        :  [RESULT] PASS with min time:   0:00:00.962641 (962641 us)                                [WALL] 1.22 s
200.genann     :  [RESULT] PASS with min time:   0:00:07.513948 (7513948 us)                               [WALL] 7.74 s
201.jpeg       :  [RESULT] PASS with min time:   0:00:00.189461 (189461 us)                                [WALL] 0.55 s
202.llama2     :  [RESULT] PASS with min time:   0:00:05.874093 (5874093 us)                               [WALL] 6.73 s
203.rsa        :  [RESULT] PASS with min time:   0:00:02.043151 (2043151 us)                               [WALL] 2.36 s
204.hypergraph :  [RESULT] PASS with min time:   0:00:00.039773 (39773 us)                                 [WALL] 0.38 s
300.bzip3      :  [RESULT] PASS with min time:   0:00:09.597375 (9597375 us)                               [WALL] 10.06 s
301.gsim       :  [RESULT] PASS with min time:   0:00:00.174483 (174483 us)                                [WALL] 0.60 s
302.lua        :  [RESULT] PASS with min time:   0:00:00.568739 (568739 us)                                [WALL] 1.19 s
303.cproc      :  [RESULT] PASS with min time:   0:00:00.009316 (9316 us)                                  [WALL] 0.48 s
304.mp3        :  [RESULT] PASS with min time:   0:00:05.118869 (5118869 us)                               [WALL] 5.76 s
305.h264       :  [RESULT] PASS with min time:   0:00:00.118241 (118241 us)                                [WALL] 0.67 s
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
GEOMEAN:       0 Marks
   MEAN:       0 Marks
   vs.   1000000 Marks @ AMD Ryzen(TM) 9 7950X3D
```

> 这里的 Marks = 0 是 mainargs=test 的预期行为，并不是 bug。只有mainargs = train/ref/huge 时才会打印 Marks。
> 

![image.png](/images/posts/ysyx-e6/image%2020.png)

将GUI模式关闭，然后测试一下：

```bash
xi@tanxi:~/ysyx/ysyx-project/fceux-am$ NPC_MAX_INST=500000000 make ARCH=minirv-npc run mainargs=mario
# Building fceux-run [minirv-npc]
********************************************************************************************************************************
********************************************************************************************************************************
********************************************************************************************************************************
********************************************************************************************************************************
********************************************************************************************************************************
********************************************************************************************************************************
********************************************************************************************************************************
********************************************************************************************************************************
********************************************************************************************************************************
********************************************************************************************************************************
********************************************************************************************************************************
********************************************************************************************************************************
********************************************************************************************************************************
********************************************************************************************************************************
********************************************************************************************************************************
********************************************************************************************************************************
********************************************************************************************************************************
```

# 七、性能测试提升

> `test`规模通常是为了快速测试功能正确性而存在的, 对应的程序输入规模通常很小, 各种循环的次数也很小, 负载很弱, 因此从性能评测的角度来说并不具备代表性。
> 

所以想要正确地评估NPC的性能，需要使用train规模的测试程序。

![image.png](/images/posts/ysyx-e6/image%2021.png)

运行train规模的测评程序：

```bash
xi@tanxi:~/ysyx/ysyx-project/archbench/scripts$ bash run.sh ARCH=minirv-npc mainargs=train
======== ARCH=minirv-npc mainargs=train =======

100.blockchain :                8 Marks [RESULT] PASS with min time:   0:00:05.071467 (5071467 us)         [WALL] 5.29 s
101.igemm      :                1 Marks [RESULT] PASS with min time:   0:00:34.620447 (34620447 us)        [WALL] 42.95 s
102.queen      :               60 Marks [RESULT] PASS with min time:   0:00:09.126600 (9126600 us)         [WALL] 10.34 s
103.dinic      :               67 Marks [RESULT] PASS with min time:   0:00:01.634123 (1634123 us)         [WALL] 13.80 s
104.malloc     :               32 Marks [RESULT] PASS with min time:   0:00:20.084857 (20084857 us)        [WALL] 22.76 s
105.bf         :               44 Marks [RESULT] PASS with min time:   0:00:03.658106 (3658106 us)         [WALL] 4.38 s
106.qsort      :               91 Marks [RESULT] PASS with min time:   0:00:02.658200 (2658200 us)         [WALL] 25.48 s
107.stream     :               28 Marks [RESULT] PASS with min time:   0:00:09.346695 (9346695 us)         [WALL] 10.84 s
108.ntt        :                1 Marks [RESULT] PASS with min time:   0:00:13.275362 (13275362 us)        [WALL] 14.63 s
200.genann     :                1 Marks [RESULT] PASS with min time:   0:01:27.860951 (87860951 us)        [WALL] 90.07 s
201.jpeg       :               15 Marks [RESULT] PASS with min time:   0:00:05.406575 (5406575 us)         [WALL] 7.71 s
202.llama2     :                1 Marks [RESULT] PASS with min time:   0:07:29.666557 (449666557 us)       [WALL] 465.45 s
203.rsa        :                9 Marks [RESULT] PASS with min time:   0:00:22.117150 (22117150 us)        [WALL] 23.56 s
204.hypergraph :               21 Marks [RESULT] PASS with min time:   0:01:19.358432 (79358432 us)        [WALL] 90.81 s
300.bzip3      :               14 Marks [RESULT] PASS with min time:   0:00:37.453632 (37453632 us)        [WALL] 38.99 s
301.gsim       :               27 Marks [RESULT] PASS with min time:   0:00:03.472628 (3472628 us)         [WALL] 5.12 s
302.lua        :               42 Marks [RESULT] PASS with min time:   0:00:01.642746 (1642746 us)         [WALL] 2.36 s
303.cproc      :               57 Marks [RESULT] PASS with min time:   0:00:03.134455 (3134455 us)         [WALL] 3.91 s
304.mp3        :                1 Marks [RESULT] PASS with min time:   0:00:41.152752 (41152752 us)        [WALL] 42.94 s
305.h264       :               17 Marks [RESULT] PASS with min time:   0:00:11.115745 (11115745 us)        [WALL] 13.70 s
12,26,8,1,60,67,32,44,91,28,1,1,15,1,9,21,14,27,42,57,1,17
GEOMEAN:      12 Marks
   MEAN:      26 Marks
   vs.   1000000 Marks @ AMD Ryzen(TM) 9 7950X3D
```

> 可见，相比AMD的Ryzen芯片，我们的NPC处理器的性能简直惨不忍睹…..
> 

# **八、NPC中流逝的时钟**

![image.png](/images/posts/ysyx-e6/image%2022.png)

![image.png](/images/posts/ysyx-e6/image%2023.png)

在下一步我们将使用EDA工具来评估NPC实现的实际频率，这里就不浪费时间了。

# **九、通过EDA工具评估NPC的频率**

## ECOS Chip Compiler

> **ECC（ECOS Chip Compiler）** 就是一个开源 **ASIC 编译器**，**把你的 RTL 代码自动跑成芯片版图 GDS**。
> 

为什么需要ECC？因为传统的商业软件非常贵，这里使用ECC将多个开源工具串起来，实现RTL代码到GDS版图文件的翻译。

下载链接：[https://github.com/openecos-projects/ecc/releases/tag/v0.1.0-alpha.10](https://github.com/openecos-projects/ecc/releases/tag/v0.1.0-alpha.10)

```bash
mkdir ecc
cd ecc
mv path-to-ecc-cli-linux-x86_64.tar.gz .
tar xvf ecc-cli-linux-x86_64.tar.gz
```

## icsprout55-pdk

> icsprout55-pdk是一个开源的 55nm CMOS 工艺设计套件（PDK），用于做 ASIC 芯片设计。
> 

它不是 FPGA 工具，也不是一个芯片代码库，而是**真正流片级别芯片设计流程中的工艺资料包**

什么是PDK？**PDK是芯片设计公司 + 晶圆厂提供给 IC 设计人员的一套规则和模型文件**。

从RTL到芯片的过程：Verilog代码 → 逻辑综合 → 布局布线 → 版图 GDS → 晶圆制造

我们必须知道：

- 晶体管长什么样
- 金属层怎么走
- 最小线宽是多少
- 两根线距离多少
- MOS 参数是多少
- 标准单元尺寸
- 时序模型

icsprout55-pdk的链接：[https://github.com/openecos-projects/icsprout55-pdk/](https://github.com/openecos-projects/icsprout55-pdk/)

通过如下方式进行安装：

```bash
git clone -b unconfirmed git@github.com:openecos-projects/icsprout55-pdk
cd icsprout55-pdk
make unzip
cd patch
bash patch.sh
```

如果发现make unzip卡住，可以直接手动下载七个文件，然后拷贝到icsprot55-pdk目录中：

[https://github.com/openecos-projects/icsprout55-pdk/releases?utm_source=chatgpt.com](https://github.com/openecos-projects/icsprout55-pdk/releases?utm_source=chatgpt.com)

然后再执行**make unzip**。

## OSS CAD Suite

> **OSS CAD Suite** 是一套打包好的开源 FPGA/数字 IC 设计工具链，包括Yosys、Verilator、nextpnr 等工具。
> 

```bash
           Verilog/SystemVerilog
                    |
                    ↓
          +----------------+
          |  OSS CAD Suite |
          +----------------+
                    |
     --------------------------------
     |              |               |
   Yosys        Verilator       nextpnr
     |              |               |
  综合工具       仿真工具       FPGA布局布线
     |
     ↓
 FPGA bitstream
```

套件地址：[https://github.com/YosysHQ/oss-cad-suite-build/releases](https://github.com/YosysHQ/oss-cad-suite-build/releases)

在最新的Asset中下载Linux版本并解压，然后将其中的bin目录加入环境变量。

如果能运行yosys说明成功：

```bash
xi@tanxi:~/tools$ yosys

 /----------------------------------------------------------------------------\
 |  yosys -- Yosys Open SYnthesis Suite                                       |
 |  Copyright (C) 2012 - 2026  Claire Xenia Wolf <claire@yosyshq.com>         |
 |  Distributed under an ISC-like license, type "license" to see terms        |
 \----------------------------------------------------------------------------/
 Yosys 0.69+73 (git sha1 2e7d8006d-dirty, Release, Clang /usr/bin/clang++ 21.1.8)

yosys> 
```

## 测试EDA工具

使用ecc创建流水灯项目：

```bash
xi@tanxi:~/tools/ecc-cli$ ./ecc init light
[init]
  project: light
  status: created
  path: light
  check: ecc check --project light
  run: ecc run --project light
  
xi@tanxi:~/tools/ecc-cli$ ls
_internal  ecc  ecc-cli-linux-x86_64.tar.gz  light 

xi@tanxi:~/tools/ecc-cli$ tree light/
light/
├── constraints
├── ecc.toml
├── rtl
│   └── light.v
└── runs

4 directories, 2 files
```

可以看到目录下出现了ligth目录。修改其中的ecc.toml：

```toml
[design]
name = "light"
top = "light"
rtl = ["rtl/light.v"]
clock_port = "clk"
frequency_mhz = 100.0

[pdk]
name = "ics55"
root = "~/tools/icsprout55-pdk"

[flow]
# preset: rtl2gds | rcx | harden | syn_sta
preset = "syn_sta"
run = "default"

[pdk.overrides]
libs = [
  "~/tools/icsprout55-pdk/IP/STD_cell/ics55_LLSC_H7C_V1p10C100/ics55_LLSC_H7CR/liberty/ics55_LLSC_H7CR_typ_tt_1p2_25_nldm.lib",
  "~/tools/icsprout55-pdk/IP/STD_cell/ics55_LLSC_H7C_V1p10C100/ics55_LLSC_H7CL/liberty/ics55_LLSC_H7CL_typ_tt_1p2_25_nldm.lib",
]
lefs = [
  "~/tools/icsprout55-pdk/IP/STD_cell/ics55_LLSC_H7C_V1p10C100/ics55_LLSC_H7CR/lef/ics55_LLSC_H7CR_ecos.lef",
  "~/tools/icsprout55-pdk/IP/STD_cell/ics55_LLSC_H7C_V1p10C100/ics55_LLSC_H7CL/lef/ics55_LLSC_H7CL_ecos.lef",
]
dont_use = [
  "*AO222*",
  "*2BB2*",
  "*AOI222*",
  "*AOI33*",
  "*OA222*",
  "*OAI222*",
  "*OAI33*",
  "*NOR4*",
]
```

注意将其中的路径一定要是**icsprout55-pdk**的路径。

在**ecc-cli/light/rtl**中创建**light.v**，并写入：

```verilog
module light (
	input clk,
	input rst,
	output reg [15:0] led
);
	
	reg [31:0] count;
	always @(posedge clk) begin
		if (rst) begin led <= 1; count <= 0; end
		else begin
			if (count == 0) led <= {led[14:0], led[15]};
			count <= (count >= 5000000 ? 32'b0 : count + 1);
		end
	end

endmodule
```

在完成上述任务后，就可以通过ECC对流水灯进行综合评估了：

```bash
xi@tanxi:~/tools/ecc-cli$ ./ecc run --project light
[run] default workspace=/home/xi/tools/ecc-cli/light/runs/default
> synthesis (yosys)

✓ synthesis (yosys) 0:00:11
  log: Synthesis_yosys/log/Synthesis.log
  inspect: ecc log synthesis --project light
[run]
  run: default
  status: success
  workspace: /home/xi/tools/ecc-cli/light/runs/default
  inspect: ecc status --project light
  log: ecc log --project light
  run: default
```

ECC将会调用yosys对RTL代码进行综合, 并将综合结果映射到ICsprout55这个PDK.

综合完成后, 可以通过阅读以下文件来查询综合的结果:

- `light/runs/default/Synthesis_yosys/report/post_synthesis/qor_summary.rpt` - 结果摘要报告, 可以查看频率和面积, 其中面积在`CELLA`列中给出, 单位是
    - 如果你想了解摘要报告中每一项指标的含义, 可以参考[**摘要报告的说明文档**](https://github.com/openecos-projects/ecc-tools/blob/main/src/operation/iSTA/QoR.md)
- `light/runs/default/Synthesis_yosys/report/post_synthesis/power.rpt` - 功耗报告
- `light/runs/default/Synthesis_yosys/log/Synthesis.log` - 综合过程的日志
- `light/runs/default/Synthesis_yosys/output/light_Synthesis.v.gz` - 综合生成的网表
- `light/runs/default/Synthesis_yosys/output/light_Synthesis_sim.v.gz` - 面向网表仿真的网表

来看结果摘要报告：

```bash
xi@tanxi:~/tools/ecc-cli/light$ cat runs/default/Synthesis_yosys/report/post_synthesis/qor_summary.rpt 
Path Group                  WNS        TNS     NVP      FREQ      WNS(H)     TNS(H)  NVP(H)
-------------------------------------------------------------------------------------------
clk                       9.037        0.0       0    1038MHz      0.120        0.0       0
-------------------------------------------------------------------------------------------
Summary                   9.037        0.0       0    1038MHz      0.120        0.0       0
-------------------------------------------------------------------------------------------
    CAP  FANOUT    TRAN    TDRC      CELLA    BUFS     LEAFS       TNETS      CTBUF    REGS
-------------------------------------------------------------------------------------------
      0       0       0       0        529      ~K        0K          ~K          ~       ~
-------------------------------------------------------------------------------------------

NVP    - No. of Violating Paths
FREQ   - Estimated Frequency, not accurate in some cases, multi/half-cycle, etc
WNS(H) - Hold WNS
TNS(H) - Hold TNS
NVP(H) - Hold NVP
```

- **WNS（Worst Negative Slack）**，最差负裕量，表示最差的一条时序路径，距离违反还有多少余量。
    - Slack = Required Time - Arrival Time
    - 这里的light模块的最差负裕量为9.037ns
- **TNS（Total Negative Slack）**，总负裕量，它统计的是所有违规路径的负裕量
    - 这里TNS为0，表示没有任何路径违规
- **NVP（No. of Violating Paths）**，违规路径数量
    - NVP=0表示灭有违规路径数量
- **FREQ**，工具估计的频率
    - 这是估算，不一定是真实芯片速度
    - 这里的light模块频率为1.038GHz

## 评估NPC的综合频率

![image.png](/images/posts/ysyx-e6/image%2024.png)

存储器在概念上不属于NPC（DPI-C机制 + 仿真程序中的全局数组）, 我们并不希望连同存储器一起综合。所以需要将它们移动到NPC的外部, 同时将访存相关的信号连接到NPC的顶层. 这样以后, 就可以将处理器模块作为综合过程的顶层了。

> 解决方案：把存储器和 ebreak 通知都挪出处理器，top 变成纯 RTL，新增一个 SoC 层负责接存储器 —— 综合时只综合 top。
> 

将ebreak和simmem从NPC处理器中剔除，重新实现Top模块，将访存信号作为输出信号，发送给外部，使得处理器变成纯RLT。

```scala
import chisel3._
import chisel3.util._

/** 顶层模块：单周期 RV32I CPU 取指 → 译码 → 读寄存器 → 立即数 / ALU → 访存 → 写回 → 更新 PC
  *
  * 这一层是**纯 RTL，不含任何 DPI-C 调用**：存储器（SimMem 黑盒）和 ebreak 通知（DPI-C）
  * 都放在 SoC 那一层（见 SoC.scala），访存相关的信号在这里只作为端口引出来。
  *
  * 好处：
  *   - 综合时直接把本模块当顶层，yosys 不需要认识 DPI-C
  *   - 存储器在概念上不属于处理器，将来接 SoC 时直接换外面那层就行
  *
  * 指令集见 ISA.scala，目前实现 14 条：
  *   ADD ADDI LUI LW LBU LB LH LHU SW SB SH JALR ECALL EBREAK
  */
class top extends Module {
  val io = IO(new Bundle {
    val pc    = Output(UInt(32.W))          // 当前 PC
    val instr = Output(UInt(32.W))          // 当前指令
    val regs  = Output(Vec(32, UInt(32.W))) // 寄存器堆快照

    // ---------------- 取指接口（存储器在外面）----------------
    val imem_addr   = Output(UInt(32.W)) // 指令地址（字节地址）
    val imem_instr  = Input(UInt(32.W))  // 从存储器取回的指令

    // ---------------- 访存接口（存储器在外面）----------------
    val dmem_addr       = Output(UInt(32.W)) // 数据访问地址（字节地址）
    val dmem_wdata      = Output(UInt(32.W)) // 写数据
    val dmem_we         = Output(Bool())     // 写使能
    val dmem_size       = Output(UInt(2.W))  // 访问宽度：0 = byte, 1 = half, 2 = word
    val dmem_zeroExtend = Output(Bool())     // 1 = 零扩展, 0 = 符号扩展
    val dmem_rdata      = Input(UInt(32.W))  // 从存储器读回的数据

    // ---------------- ebreak 通知 ----------------
    // 译码器认出 ebreak 时给出 trigger=1，由外面的 SoC 层去通知仿真环境。
    val halt_trigger = Output(Bool())    // 1 = 当前指令是 ebreak
    val halt_pc      = Output(UInt(32.W)) // ebreak 的地址
    val halt_a0      = Output(UInt(32.W)) // 顺便带上 a0，方便打印现场
  })

  val xlen = 32

  // ---------------- 取指 ----------------
  // 程序的基址：和 AM(abstract-machine) / nemu / ysyxSoC 一致，都是 0x80000000。
  // 内存是 C 侧那块 16MB 平坦内存 + 地址掩码（0x80000000 & 0xFFFFFF = 0），
  // 所以镜像装在 offset 0，程序里看到的地址和这里算出来的地址始终自洽。
  val memBase = BigInt("80000000", 16) // 注意要指定 16 进制，BigInt(String) 默认按十进制解析

  val pc = Module(new PC(xlen = xlen, initAddr = memBase))

  // 取指：只把地址给出去，指令从外面送进来
  io.imem_addr  := pc.io.pc
  val instr     = io.imem_instr

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
  // 地址 = ALU 结果（rs1 + imm，字节地址），写数据恒为 rs2
  io.dmem_addr       := alu.io.result
  io.dmem_wdata      := rf.io.out2
  io.dmem_we         := ctrl.io.ctrl.memWrite
  io.dmem_size       := ctrl.io.ctrl.memSize.asUInt
  io.dmem_zeroExtend := ctrl.io.ctrl.memUnsigned

  // ---------------- 写回 ----------------
  // 访存指令写回内存数据，其余写回 ALU 结果；
  // 跳转类指令（JAL/JALR）写回 pc+4（link）
  val wbData = Mux(ctrl.io.ctrl.memRead, io.dmem_rdata, alu.io.result)
  rf.io.data := Mux(ctrl.io.ctrl.link, pc.io.pc + 4.U(xlen.W), wbData)
  rf.io.we   := ctrl.io.ctrl.regWrite

  // ---------------- 更新 PC ----------------
  // 跳转：JALR 的目标是 (rs1 + imm) & ~1，alu.io.result 就是 rs1 + imm
  val jumpTarget = alu.io.result & (~1.U(xlen.W))
  pc.io.next := Mux(ctrl.io.ctrl.jump, jumpTarget, pc.io.pc + 4.U(xlen.W))

  // ---------------- ebreak ----------------
  io.halt_trigger := ctrl.io.ctrl.halt
  io.halt_pc      := pc.io.pc
  io.halt_a0      := rf.io.regs(10)

  // ---------------- 调试输出 ----------------
  io.pc    := pc.io.pc
  io.instr := instr
  io.regs  := rf.io.regs
}

```

新增一个SoC模块，作为包装层，在其中实例化NPC处理器、ebreak和内存模块，然后让它们之间进行交互，在综合时仅考虑NPC处理器本身。

```scala
import chisel3._
import chisel3.util._

/** 仿真用的 SoC 包装层
  *
  * 把处理器（top，纯 RTL）和存储器接在一起：
  *   - 取指和数据访问共用一块存储器（SimMem 黑盒，DPI-C 访问 C 侧那块内存）
  *   - ebreak 时通过 DPI-C 通知 C 主程序收尾
  *
  * 这一层含 DPI-C，**不参与综合**。综合时把 top 当顶层（见 synth/rtl/filelist.f），
  * 存储器和通知都在处理器外面，将来接真正的 SoC 时换的就是这一层。
  */
class soc extends Module {
  val io = IO(new Bundle {
    val pc    = Output(UInt(32.W))          // 当前 PC
    val instr = Output(UInt(32.W))          // 当前指令
    val regs  = Output(Vec(32, UInt(32.W))) // 寄存器堆快照
  })

  val cpu = Module(new top)

  // ---------------- 指令存储器 ----------------
  val imem = Module(new SimMem)
  imem.io.clock      := clock
  imem.io.addr       := cpu.io.imem_addr
  imem.io.wdata      := 0.U
  imem.io.we         := false.B
  imem.io.size       := 2.U // word
  imem.io.zeroExtend := true.B
  cpu.io.imem_instr  := imem.io.rdata

  // ---------------- 数据存储器 ----------------
  // 和取指共用同一块内存（统一存储）
  val dmem = Module(new SimMem)
  dmem.io.clock      := clock
  dmem.io.addr       := cpu.io.dmem_addr
  dmem.io.wdata      := cpu.io.dmem_wdata
  dmem.io.we         := cpu.io.dmem_we
  dmem.io.size       := cpu.io.dmem_size
  dmem.io.zeroExtend := cpu.io.dmem_zeroExtend
  cpu.io.dmem_rdata  := dmem.io.rdata
  
  // ---------------- ebreak 通知 ----------------
  // 译码器把当前指令认成 ebreak 时给出 trigger=1，
  // 在下一个时钟上升沿通过 DPI-C 通知 C 主程序结束仿真。
  val halt = Module(new Halt)
  halt.io.clock   := clock
  halt.io.trigger := cpu.io.halt_trigger
  halt.io.pc      := cpu.io.halt_pc
  halt.io.a0      := cpu.io.halt_a0

  // ---------------- 调试输出 ----------------
  io.pc    := cpu.io.pc
  io.instr := cpu.io.instr
  io.regs  := cpu.io.regs
}

```

### 阶段1：初始化 ECC 项目

```
cd /home/xi/ysyx/ysyx-project/npc/synth
~/tools/ecc-cli/ecc init npc
```

生成 npc/synth/npc/ecc.toml(注意是 npc/ 子目录,因为 ecc init npc 会以名字建子目录)。

### 阶段2：改 npc/synth/npc/ecc.toml

```bash
[design]
name = "npc"
# 综合顶层是处理器本身（纯 RTL）；存储器在 SoC 那一层，不参与综合
top = "top"
rtl = ["rtl/filelist.f"]
clock_port = "clock"
frequency_mhz = 100.0

[pdk]
name = "ics55"
root = "~/tools/icsprout55-pdk"

[flow]
# preset: rtl2gds | rcx | harden | syn_sta
preset = "syn_sta"
run = "default"

[pdk.overrides]
libs = [
  "~/tools/icsprout55-pdk/IP/STD_cell/ics55_LLSC_H7C_V1p10C100/ics55_LLSC_H7CR/liberty/ics55_LLSC_H7CR_typ_tt_1p2_25_nldm.lib",
  "~/tools/icsprout55-pdk/IP/STD_cell/ics55_LLSC_H7C_V1p10C100/ics55_LLSC_H7CL/liberty/ics55_LLSC_H7CL_typ_tt_1p2_25_nldm.lib",
]
lefs = [
  "~/tools/icsprout55-pdk/IP/STD_cell/ics55_LLSC_H7C_V1p10C100/ics55_LLSC_H7CR/lef/ics55_LLSC_H7CR_ecos.lef",
  "~/tools/icsprout55-pdk/IP/STD_cell/ics55_LLSC_H7C_V1p10C100/ics55_LLSC_H7CL/lef/ics55_LLSC_H7CL_ecos.lef",
]
dont_use = [
  "*AO222*",
  "*2BB2*",
  "*AOI222*",
  "*AOI33*",
  "*OA222*",
  "*OAI222*",
  "*OAI33*",
  "*NOR4*",
]

```

### 阶段3：写 RTL 列表 npc/synth/npc/rtl/filelist.f

```bash
../../../build/chisel/PC.sv
../../../build/chisel/Controler.sv
../../../build/chisel/RegFile.sv
../../../build/chisel/ImmGen.sv
../../../build/chisel/ALU.sv
../../../build/chisel/top.sv
```

只列纯 RTL，soc.sv、SimMem.sv、Halt.sv 不参与综合。

### 阶段4：使用ecc-cli检查要综合的目标

```bash
cd /home/xi/ysyx/ysyx-project/npc/synth
~/tools/ecc-cli/ecc check --project npc
```

### 阶段5：综合

```bash
cd /home/xi/ysyx/ysyx-project/npc/synth
~/tools/ecc-cli/ecc run --project npc
```

产物在 npc/synth/npc/runs/default/。重跑要加 --overwrite(否则报 run_exists):

```bash
~/tools/ecc-cli/ecc run --overwrite --project npc
```

### 阶段6：看报告

综合报告都在 runs/default/Synthesis_yosys/ 下：

```bash
cd ~/ysyx/ysyx-project/npc

# 1. 最重要: QoR汇总(频率/余量/面积) —— 看综合结果先看这个
cat runs/default/Synthesis_yosys/report/post_synthesis/qor_summary.rpt

# 2. 功耗报告
cat runs/default/Synthesis_yosys/report/post_synthesis/power.rpt

# 3. yosys检查(代码问题, 比如推断出latch)
cat runs/default/Synthesis_yosys/report/Synthesis_check.rpt

# 4. 时序路径明细(JSON格式, 1000条路径)
python3 -m json.tool runs/default/Synthesis_yosys/data/sta/timing_reporter/timing_paths.json | less
```

为了后续方便进行综合与清理，修改Makefile，添加相关命令：

```bash
# ---------------------------------------------------------------------------
# npc：Chisel 写的 RV32I 单周期核 + verilator 仿真
#
#   make run                    跑默认程序（sim/progs/verify.hex）
#   make run PROG=xxx           跑别的程序
#   make run DIFFTEST=1         顺便和 old-minirvEMU 逐拍对拍
#   make run TRACE=1            逐周期打印 PC / 指令
#   make run CYCLES=10000000    改周期上限（默认 32）
#   make synth                  综合 + 时序分析（ECC），看综合频率
#   make clean                  清生成物（含综合结果）
#
# AM(abstract-machine) 的 cpu-tests 在 am-kernels/tests/cpu-tests 下跑：
#   make ARCH=minirv-npc [ALL=xxx] [DIFFTEST=1] run
# 想把某个 AM 测试编成 npc 能跑的 hex：
#   sh sim/am_build.sh dummy minirv-npc sim/progs/dummy-am.hex
# ---------------------------------------------------------------------------

TOPNAME  = soc
BUILD_DIR = ./build
OBJ_DIR   = $(BUILD_DIR)/obj_dir
BIN       = $(abspath $(BUILD_DIR)/$(TOPNAME))

# 默认目标：只编译，不跑程序（跑程序用 make run）
.DEFAULT_GOAL := $(BIN)

CHISEL_DIR = ./chisel
CHISEL_OUT = $(BUILD_DIR)/chisel
SIM_DIR    = ./sim

# ---- 跑程序的选项 ----
PROG     ?= $(SIM_DIR)/progs/verify.hex # 跑哪个程序
CYCLES   ?= 32                          # 周期上限
DIFFTEST ?=                             # 非空就开对拍（和 old-minirvEMU 逐拍比）
TRACE    ?=                             # 非空就逐周期打印 PC / 指令

VERILATOR = verilator
VERILATOR_CFLAGS += -MMD --build -cc \
                    -O3 --x-assign fast --x-initial fast --noassert
# difftest.cpp 要 include 参考侧的 minirvEMU.h（verilator 在 obj_dir 里编译，要绝对路径）
VERILATOR_CFLAGS += -CFLAGS "-I$(abspath $(EMU_DIR))"

CXX      = g++
CXXFLAGS = -O2 -Wall

# 参考侧：old-minirvEMU（自带 main()，编译时改名，免得和仿真主程序打架）
EMU_DIR = ../old-minirvEMU
EMU_SRC = $(EMU_DIR)/minirvEMU.cpp
EMU_OBJ = $(abspath $(BUILD_DIR)/emu/minirvEMU.o)

# Chisel 源文件（RTL 的唯一真相）
CHISEL_SRCS = $(shell find $(CHISEL_DIR)/src/main/scala -name "*.scala")

# C++ 源文件：仿真主程序 + C 侧内存（DPI-C）+ ebreak 通知（DPI-C）+ 对拍
CSRCS = $(SIM_DIR)/sim_main.cpp $(SIM_DIR)/sim_mem.cpp $(SIM_DIR)/sim_halt.cpp \
        $(SIM_DIR)/difftest.cpp $(EMU_OBJ)

# Chisel 生成的 SystemVerilog（含黑盒的 inline Verilog）
VSRCS = $(wildcard $(CHISEL_OUT)/*.sv)

# ---- 综合（ECC）----
# 综合的顶层是处理器本身（top，纯 RTL）：存储器在 SoC 那一层（soc.sv，含
# DPI-C），不参与综合。RTL 列表在 synth/npc/rtl/filelist.f，配置在 ecc.toml。
SYNTH_DIR = synth
ECC       = $(HOME)/tools/ecc-cli/ecc
ECC_PROJ  = npc
ECC_QOR   = $(SYNTH_DIR)/$(ECC_PROJ)/runs/default/Synthesis_yosys/report/post_synthesis/qor_summary.rpt

$(shell mkdir -p $(BUILD_DIR))

# ---------------------------------------------------------------------------
# 生成 RTL、编译仿真程序
# ---------------------------------------------------------------------------
# chisel-generate 只是生成 RTL 的别名，方便单独生成。
# 编译仿真程序直接依赖 filelist.f（而不是这个 phony 目标），
# 这样 RTL 没变就不会重编，AM 那边反复跑测试时才不用每次都等一遍 verilator。
chisel-generate: $(CHISEL_OUT)/filelist.f

$(CHISEL_OUT)/filelist.f: $(CHISEL_SRCS) \
                      $(CHISEL_DIR)/src/main/resources/SimMem.sv \
                      $(CHISEL_DIR)/src/main/resources/Halt.sv \
                      $(CHISEL_DIR)/build.sbt \
                      $(CHISEL_DIR)/project/build.properties
	mkdir -p $(CHISEL_OUT)
	cd $(CHISEL_DIR) && sbt -batch run
	test -f $(CHISEL_OUT)/filelist.f

$(BIN): $(CHISEL_OUT)/filelist.f $(CSRCS)
	@rm -rf $(OBJ_DIR)
	$(VERILATOR) $(VERILATOR_CFLAGS) \
		--top-module $(TOPNAME) $(VSRCS) $(CSRCS) \
		--Mdir $(OBJ_DIR) --exe -o $(BIN)

# 编译参考侧 old-minirvEMU：它的 main() 改名，避免和仿真主程序冲突
$(EMU_OBJ): $(EMU_SRC) $(EMU_DIR)/minirvEMU.h
	mkdir -p $(dir $@)
	$(CXX) $(CXXFLAGS) -Dmain=emu_main -c -o $@ $<

# ---------------------------------------------------------------------------
# 跑程序
# ---------------------------------------------------------------------------
run: $(BIN)
	$(BIN) --cycles $(CYCLES) $(if $(DIFFTEST),--difftest,) $(if $(TRACE),--trace,) $(PROG)

# ---------------------------------------------------------------------------
# 综合（ECC）
#
#   make synth                综合 + 时序分析，顺带打印频率/面积
#   make synth ECC=/path/ecc  换 ECC 可执行文件
#
# 依赖 filelist.f：改了 Chisel 源码会先重新生成 RTL 再综合。
# ---------------------------------------------------------------------------
synth: $(CHISEL_OUT)/filelist.f
	@test -x $(ECC) || { echo "找不到 ECC：$(ECC)"; exit 1; }
	cd $(SYNTH_DIR) && $(ECC) check --project $(ECC_PROJ) && \
	  $(ECC) run --overwrite --project $(ECC_PROJ)
	@echo "---- 综合结果（频率 / 面积）----"
	@cat $(ECC_QOR)

# ---------------------------------------------------------------------------
# 检查
# ---------------------------------------------------------------------------
lint: chisel-generate
	$(VERILATOR) --lint-only -Wall \
		-Wno-UNUSEDSIGNAL \
		--top-module $(TOPNAME) \
		$(VSRCS)

format:
	cd $(CHISEL_DIR) && sbt -batch scalafmtAll

checkformat:
	cd $(CHISEL_DIR) && sbt -batch scalafmtCheckAll

# 清理：生成物 + 综合结果（ECC 的 runs/ 和 RTL 快照）
# 综合的产物有 18MB，每次 clean 一起清掉；ecc.toml 和 rtl/filelist.f 保留
clean:
	rm -rf $(BUILD_DIR)
	rm -rf $(SYNTH_DIR)/*/runs $(SYNTH_DIR)/*/build

.PHONY: run chisel-generate synth lint format checkformat clean

```

下面来使用命令进行综合：

```bash
xi@tanxi:~/ysyx/ysyx-project/npc$ make synth 
cd synth && /home/xi/tools/ecc-cli/ecc check --project npc && \
  /home/xi/tools/ecc-cli/ecc run --overwrite --project npc
[check]
  project: npc
  status: checked
  config: ecc.toml
  config: ecc.toml
  inspect: ecc status --project npc
  run: ecc run --project npc
  rtl: pass
    path: rtl/filelist.f
  inspect: ecc check --json --project npc

[run] default workspace=/home/xi/ysyx/ysyx-project/npc/synth/npc/runs/default
> synthesis (yosys)
  log: [STA 20261028 17:43:15 qVE7dJ0A TimingAnalyzer.cpp:62 Info analyze] Completed (elapsed = 00:00:00, cpu = 00:00:00, mem = 0.00MB)

✓ synthesis (yosys) 0:00:28
  log: Synthesis_yosys/log/Synthesis.log
  inspect: ecc log synthesis --project npc
[run]
  run: default
  status: success
  workspace: /home/xi/ysyx/ysyx-project/npc/synth/npc/runs/default
  inspect: ecc status --project npc
  log: ecc log --project npc
  run: default

---- 综合结果（频率 / 面积）----
Path Group                  WNS        TNS     NVP      FREQ      WNS(H)     TNS(H)  NVP(H)
-------------------------------------------------------------------------------------------
clock                     7.983        0.0       0     496MHz      0.119        0.0       0
-------------------------------------------------------------------------------------------
Summary                   7.983        0.0       0     496MHz      0.119        0.0       0
-------------------------------------------------------------------------------------------
    CAP  FANOUT    TRAN    TDRC      CELLA    BUFS     LEAFS       TNETS      CTBUF    REGS
-------------------------------------------------------------------------------------------
      0       0       0       0      15706      ~K        5K          ~K          ~       ~
-------------------------------------------------------------------------------------------

NVP    - No. of Violating Paths
FREQ   - Estimated Frequency, not accurate in some cases, multi/half-cycle, etc
WNS(H) - Hold WNS
TNS(H) - Hold TNS
NVP(H) - Hold NVP
```

其中最重要的内容是 qor_summary.rpt，可以看到FREQ字段的值为496MHz ，这就是我们的NPC处理器的频率。

![image.png](/images/posts/ysyx-e6/image%2025.png)

> **一个惊天发现：不能用墙钟时间来评价性能！！**
> 

我们要比的是"CPU 的快慢"，但在仿真里使用墙钟，测量的是"模拟器（Verilator）执行的速度"。

**CPU的执行程序所需的时间 = 拍数 / 频率**，因为我们在使用verilator进行仿真，其跑一拍要花的时间会更长，这就导致我们的测量结果会非常慢。

所以想要真正地测试NPC处理器运行一个程序的耗时，可以统计处理器执行的拍数，然后用它除以综合得到的估计频率得到。

> 我们要回答的是同一个问题:"这个 CPU 跑这个程序要多久"。仿真里墙钟答不了(答的是模拟器),所以用 拍数 / 频率 来回答 —— 答案是"若这个核真以 496MHz 运行,需 355 ms"。
> 

修改get_time()函数，将其从墙钟换成按拍数（运行的周期数）折算的模拟时间：

```cpp
// sim_main.cpp
#define NPC_FREQ_MHZ 496 // 综合报告里的 FREQ：496MHz

unsigned long long get_time() {
    return mem_cycle() / NPC_FREQ_MHZ;
}
```

同时修改sim_mem.cpp，在其中变量 g_cycle 记录程序执行经过的周期数，并实现两个函数供外部使用。

```cpp
// sim_mem.cpp
// 当前拍号：仿真主循环每拍更新一次
static unsigned long long g_cycle = 0;

void mem_set_cycle(unsigned long long cycle) { g_cycle = cycle; }

unsigned long long mem_cycle() { return g_cycle; }
```

重新跑一下archbench：

```bash
xi@tanxi:~/ysyx/ysyx-project/archbench/scripts$ bash run.sh ARCH=minirv-npc mainargs=train
======== ARCH=minirv-npc mainargs=train =======

100.blockchain :              502 Marks [RESULT] PASS with min time:   0:00:00.085656 (85656 us)           [WALL] 5.49 s
101.igemm      :               35 Marks [RESULT] PASS with min time:   0:00:00.618856 (618856 us)          [WALL] 43.36 s
102.queen      :             3088 Marks [RESULT] PASS with min time:   0:00:00.178429 (178429 us)          [WALL] 10.63 s
103.dinic      :             4020 Marks [RESULT] PASS with min time:   0:00:00.027358 (27358 us)           [WALL] 13.89 s
104.malloc     :             1820 Marks [RESULT] PASS with min time:   0:00:00.355491 (355491 us)          [WALL] 22.65 s
105.bf         :             2575 Marks [RESULT] PASS with min time:   0:00:00.062520 (62520 us)           [WALL] 4.42 s
106.qsort      :             5673 Marks [RESULT] PASS with min time:   0:00:00.042653 (42653 us)           [WALL] 25.81 s
107.stream     :             1727 Marks [RESULT] PASS with min time:   0:00:00.156313 (156313 us)          [WALL] 10.60 s
108.ntt        :               28 Marks [RESULT] PASS with min time:   0:00:00.244514 (244514 us)          [WALL] 14.76 s
200.genann     :               41 Marks [RESULT] PASS with min time:   0:00:01.574523 (1574523 us)         [WALL] 92.28 s
201.jpeg       :              760 Marks [RESULT] PASS with min time:   0:00:00.109131 (109131 us)          [WALL] 7.58 s
202.llama2     :               25 Marks [RESULT] PASS with min time:   0:00:08.059030 (8059030 us)         [WALL] 475.98 s
203.rsa        :              539 Marks [RESULT] PASS with min time:   0:00:00.402121 (402121 us)          [WALL] 23.95 s
204.hypergraph :             1237 Marks [RESULT] PASS with min time:   0:00:01.407839 (1407839 us)         [WALL] 91.82 s
300.bzip3      :              856 Marks [RESULT] PASS with min time:   0:00:00.654154 (654154 us)          [WALL] 39.39 s
301.gsim       :             1618 Marks [RESULT] PASS with min time:   0:00:00.059316 (59316 us)           [WALL] 4.99 s
302.lua        :             2510 Marks [RESULT] PASS with min time:   0:00:00.027483 (27483 us)           [WALL] 2.24 s
303.cproc      :             3464 Marks [RESULT] PASS with min time:   0:00:00.052245 (52245 us)           [WALL] 3.85 s
304.mp3        :               22 Marks [RESULT] PASS with min time:   0:00:00.724770 (724770 us)          [WALL] 43.31 s
305.h264       :              978 Marks [RESULT] PASS with min time:   0:00:00.193129 (193129 us)          [WALL] 13.97 s
600,1575,502,35,3088,4020,1820,2575,5673,1727,28,41,760,25,539,1237,856,1618,2510,3464,22,978
GEOMEAN:     600 Marks
   MEAN:    1575 Marks
   vs.   1000000 Marks @ AMD Ryzen(TM) 9 7950X3D
```

两个注意点：

1. **496MHz 是综合阶段的估算值**，没有布局布线、没有布线延迟，实际流片频率一定会低不少。用它折算出的分数是乐观值。想按 100MHz 口径评估,把 NPC_FREQ_MHZ 改成 100 即可(366 Marks)。
2. 时钟寄存器只读低 32 位(timer.c 里 (volatile uint32_t )0x20000000)，32 位微秒约 71 分钟会出现溢出回绕。

> 需要说明的是, **综合报告中的频率, 也并非芯片最终的工作频率, 因为这个频率还没有考虑后端物理设计的因素**，完成后端设计流程后, 芯片的最高工作频率还会进一步下降. 但对前端设计的迭代流程来说, 综合报告中的频率仍然具有参考价值。
>