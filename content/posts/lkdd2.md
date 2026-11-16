---
title: "Linux设备驱动开发-Ch2-Linux内核模块"
date: '2026-11-14T10:56:37+08:00'
draft: false
tags: [Linux设备驱动开发]
categories: [Linux]
---

# 一、内核模块简介

## 1.1 什么是内核模块？

Linux 内核采用模块化设计，允许开发者通过添加独立的软件组件来扩展内核功能，而不需要每次修改内核都重新编译整个内核。

**内核模块（Kernel Module）** 是一种能够在运行时动态加载到 Linux 内核中，并在不再需要时动态卸载的软件组件。

当内核模块用于控制和管理特定硬件设备时，它通常被称为**设备驱动程序（Device Driver）**。

例如：

- 网络设备驱动程序：负责管理网卡，处理网络数据包。
- 块设备驱动程序：负责管理磁盘、SSD 等存储设备。
- 字符设备驱动程序：负责管理串口、终端等字符设备。
- 文件系统模块：为内核提供额外的文件系统支持。

需要注意：并不是所有内核模块都是设备驱动程序。Linux 还使用模块实现文件系统、加密算法、网络协议以及其他可选内核功能。

## 1.2 静态模块与动态模块

Linux 内核功能可以通过两种方式集成到内核中。

**1. 静态模块（Built-in Modules）**

静态模块也称为内置模块。在构建内核时，通过配置文件 `.config` 选择需要启用的功能，并将对应源代码编译为目标文件，最终链接到内核映像文件中。

例如：

```text
CONFIG_EXT4_FS=y
CONFIG_E1000=y
```

其中 `y` 表示将对应功能编译进内核。

优点：

- 不需要额外执行模块加载操作。
- 内核启动时即可使用相关功能。
- 不存在模块加载和卸载带来的额外管理开销。

缺点：

- 修改代码后通常需要重新构建内核。
- 无法在运行时独立卸载某个内置功能。
- 内置功能通常会一直占用内核映像及相应的运行时资源。

**2. 动态模块（Loadable Kernel Modules，LKM）**

动态模块与内核映像文件相互独立，通常以 `.ko`（Kernel Object）作为文件扩展名。

它们可以在系统运行期间动态加载和卸载。

例如：

```bash
sudo insmod helloworld.ko
sudo rmmod helloworld
```

优点：

- 不需要重新编译和启动整个内核即可扩展功能。
- 可以按需加载功能，减少不必要的内核常驻代码。
- 便于开发和调试驱动程序。

缺点：

- 模块必须与目标内核的版本、配置及符号接口兼容。
- 模块加载、卸载以及模块间依赖需要额外管理。
- 模块运行在内核态，错误可能导致整个系统崩溃。

**补充：** 动态模块虽然能够独立加载，但并不意味着它完全不依赖内核。模块仍然需要使用目标内核提供的头文件、配置、符号和构建环境。

## 1.3 内核模块相关配置

Linux 内核提供以下配置选项：

| 配置项 | 作用 |
|---|---|
| `CONFIG_MODULES` | 是否支持内核模块 |
| `CONFIG_MODULE_UNLOAD` | 是否支持卸载内核模块 |
| `CONFIG_MODULE_FORCE_UNLOAD` | 是否允许强制卸载正在使用的模块 |

例如：

```text
CONFIG_MODULES=y
CONFIG_MODULE_UNLOAD=y
CONFIG_MODULE_FORCE_UNLOAD=y
```

需要注意，强制卸载模块具有较高风险。它可能破坏正在使用模块的内核数据结构，导致系统崩溃，因此不应该在正常开发和生产环境中随意使用。


# 二、编写第一个内核模块

## 2.1 Hello World

下面编写一个最简单的 Linux 内核模块：

```c
#include <linux/init.h>
#include <linux/module.h>
#include <linux/kernel.h>

static int __init hello_world_init(void)
{
    pr_info("Hello world!\n");
    return 0;
}

static void __exit hello_world_exit(void)
{
    pr_info("End of the world\n");
}

module_init(hello_world_init);
module_exit(hello_world_exit);

MODULE_AUTHOR("John Madieu <john.madieu@gmail.com>");
MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("A simple Hello World kernel module");
```

### 头文件的作用

- `linux/init.h`：提供 `__init`、`__exit` 等初始化和退出相关的标记。
- `linux/module.h`：提供模块基础设施，包括 `module_init`、`module_exit` 和 `MODULE_*` 系列宏。
- `linux/kernel.h`：提供内核常用接口，包括 `pr_info` 等日志打印宏。

实际开发中，还需要根据使用的接口包含相应头文件，例如：

- `linux/fs.h`：文件系统及文件操作相关接口。
- `linux/interrupt.h`：中断处理相关接口。
- `linux/pci.h`：PCI 设备相关接口。
- `linux/slab.h`：内核动态内存分配接口。

原则是使用什么接口，就包含对应的头文件，不要过度依赖其他头文件的间接包含。

## 2.2 模块初始化函数

```c
static int __init hello_world_init(void)
{
    pr_info("Hello world!\n");
    return 0;
}
```

模块初始化函数在模块加载过程中执行，主要负责完成模块运行前的初始化工作。

例如：

- 申请内存。
- 注册字符设备。
- 注册中断处理程序。
- 初始化工作队列。
- 注册设备驱动程序。

其中有几个值得注意的地方。

**`static`**：表示该函数具有内部链接属性，只能在当前源文件中使用。

**`__init`**：表示该函数只在初始化阶段使用。

Linux 内核通过链接脚本将带有 `__init` 标记的代码放入 `.init.text` 段。

当初始化过程成功完成后，这部分内存可以被回收。

对于动态模块来说，模块加载成功后，模块初始化代码占用的内存也可以被释放。

**返回值**

- 返回 `0`：初始化成功，模块可以正常加载。
- 返回非 `0`：初始化失败，内核拒绝加载模块，并将错误码返回给调用者。

这里有一个重要细节：

如果初始化函数在执行过程中申请了资源，但随后某一步初始化失败，那么必须在返回错误之前释放已经申请的资源。

例如：

```c
static int __init hello_world_init(void)
{
    void *ptr;

    ptr = kmalloc(1024, GFP_KERNEL);
    if (!ptr)
        return -ENOMEM;

    if (some_init_function()) {
        kfree(ptr);
        return -EINVAL;
    }

    return 0;
}
```

这里的 `some_init_function()` 仅作为示意。

因为模块初始化失败后，模块不会进入正常运行状态，内核不会再调用该模块的退出函数替你清理已经申请的资源。

## 2.3 模块退出函数

```c
static void __exit hello_world_exit(void)
{
    pr_info("End of the world\n");
}
```

模块退出函数在模块被正常卸载时执行，主要负责释放模块初始化和运行期间申请的资源。

例如：

- 释放动态分配的内存。
- 注销设备号。
- 释放中断资源。
- 注销设备驱动程序。
- 取消定时器和工作队列。
- 释放其他模块占用的资源。

**`__exit`**：表示该函数只在模块卸载阶段使用。

如果内核不支持模块卸载（`CONFIG_MODULE_UNLOAD=n`），该函数通常会被丢弃，不需要保留在最终内核映像中。

退出函数返回类型为 `void`，正常卸载过程不能通过返回值报告失败。

需要注意，卸载模块前必须保证模块不再被其他内核组件使用，否则内核通常会拒绝卸载。

## 2.4 注册模块入口和出口

```c
module_init(hello_world_init);
module_exit(hello_world_exit);
```

这两个宏用于向内核注册模块的初始化函数和退出函数。

对于动态模块：

- `module_init()` 指定模块加载时执行的入口函数。
- `module_exit()` 指定模块卸载时执行的清理函数。

对于内置代码，`module_init()` 会根据初始化级别转换为相应的内核初始化机制，而不是动态模块加载入口。

## 2.5 内核日志打印

在示例中，我们使用了：

```c
pr_info("Hello world!\n");
```

`pr_info` 是 Linux 内核提供的信息级别日志打印宏，其本质上是对 `printk` 的封装。

可以简单理解为：

```c
#define pr_info(fmt, ...) \
    printk(KERN_INFO pr_fmt(fmt), ##__VA_ARGS__)
```

其中：

- `printk`：内核提供的日志打印函数。
- `KERN_INFO`：表示日志级别为 INFO。
- `pr_fmt`：用于为日志添加统一的前缀。

Linux 内核定义了多个日志级别：

| 宏 | 日志级别 | 含义 |
|---|---|---|
| `KERN_EMERG` | 0 | 系统不可用 |
| `KERN_ALERT` | 1 | 必须立即采取行动 |
| `KERN_CRIT` | 2 | 严重错误 |
| `KERN_ERR` | 3 | 错误 |
| `KERN_WARNING` | 4 | 警告 |
| `KERN_NOTICE` | 5 | 普通但重要的信息 |
| `KERN_INFO` | 6 | 一般信息 |
| `KERN_DEBUG` | 7 | 调试信息 |

常用打印宏：

```c
pr_emerg("Emergency message\n");
pr_alert("Alert message\n");
pr_crit("Critical message\n");
pr_err("Error message\n");
pr_warn("Warning message\n");
pr_notice("Notice message\n");
pr_info("Information message\n");
pr_debug("Debug message\n");
```

内核日志会写入内核环形缓冲区（Kernel Ring Buffer），可以使用 `dmesg` 查看。

例如：

```bash
sudo dmesg
```

也可以实时查看新产生的内核日志：

```bash
sudo dmesg -w
```

需要注意，日志级别与日志是否显示在控制台是两个不同的概念。日志首先进入内核日志缓冲区，是否显示在控制台还受到 `console_loglevel` 等配置的影响。


# 三、构建和加载内核模块

## 3.1 准备内核构建环境

编译内核模块需要使用与目标内核相匹配的构建环境。

通常有两种方式：

**方式一：使用发行版提供的内核头文件**

例如 Ubuntu：

```bash
sudo apt update
sudo apt install build-essential linux-headers-$(uname -r)
```

其中：

```bash
/lib/modules/$(uname -r)/build
```

通常是指向当前运行内核构建目录的符号链接。

可以通过以下命令查看：

```bash
ls -l /lib/modules/$(uname -r)/build
```

**方式二：使用自行编译的 Linux 内核源码**

如果正在研究 Linux 内核源码，或者使用自行编译的内核，就可以使用对应的内核源码和构建目录。

需要注意：内核模块不仅依赖头文件，还依赖目标内核的配置、生成文件和符号版本信息。因此，不能随意使用另一个版本的内核源码来编译模块。

## 3.2 编写 Makefile

Linux 内核拥有一套专门的构建系统，称为 **Kbuild**。

编写外部内核模块时，需要通过 Kbuild 完成编译和链接，而不是直接使用普通 GCC 命令。

创建 Makefile：

```makefile
obj-m := helloworld.o

KERNELDIR ?= /lib/modules/$(shell uname -r)/build

PWD := $(shell pwd)

all:
	$(MAKE) -C $(KERNELDIR) M=$(PWD) modules

clean:
	$(MAKE) -C $(KERNELDIR) M=$(PWD) clean
```

解释一下：

**1. `obj-m`**

这是 Kbuild 提供的构建变量：

```makefile
obj-m := helloworld.o
```

表示将 `helloworld.o` 构建为一个可加载的内核模块，最终生成：

```text
helloworld.ko
```

其中：

- `obj-y`：将目标文件编译进内核。
- `obj-m`：将目标文件编译为独立的可加载模块。

**2. `KERNELDIR`**

```makefile
KERNELDIR ?= /lib/modules/$(shell uname -r)/build
```

指定目标内核的构建目录。

`?=` 表示只有在变量尚未定义时才赋予默认值，因此可以通过命令行覆盖：

```bash
make KERNELDIR=/path/to/linux
```

**3. `make -C`**

```makefile
$(MAKE) -C $(KERNELDIR) M=$(PWD) modules
```

这里是整个 Makefile 的核心。

- `-C $(KERNELDIR)`：先切换到内核构建目录，使用内核自身的 Makefile。
- `M=$(PWD)`：告诉 Kbuild，当前目录是外部模块的源代码目录。
- `modules`：执行模块构建目标。

## 3.3 为什么必须使用 Kbuild？

这是理解 Linux 内核模块构建机制的关键。

普通 C 程序通常可以直接通过 GCC 编译：

```bash
gcc main.c -o main
```

但是，内核模块不能简单地按照普通 C 程序的方式构建。

主要有以下原因：

**1. 依赖内核内部头文件**

内核模块需要使用：

```c
#include <linux/module.h>
#include <linux/kernel.h>
```

这些头文件位于 Linux 内核源码树中，需要由 Kbuild 管理包含路径。

**2. 依赖内核编译配置**

内核在构建时会使用大量特定编译选项，例如：

- `-D__KERNEL__`
- `-DMODULE`
- 目标架构相关的编译选项。
- 栈保护和代码生成选项。
- 内核特定的编译器参数。

这些配置需要与目标内核保持一致。

**3. 需要额外的模块构建流程**

内核模块并不是简单地将 `.o` 文件链接成 `.ko` 文件。

Kbuild 还需要完成：

- 生成模块元信息。
- 处理模块许可证、作者等信息。
- 处理模块依赖。
- 处理符号版本信息。
- 生成最终的 `.ko` 文件。

因此，只有内核自身的 Kbuild 才能正确处理这些细节。

## 3.4 编译内核模块

执行：

```bash
make
```

成功后，目录中会生成：

```text
helloworld.ko
```

此外，还可能看到：

```text
helloworld.o
helloworld.mod
helloworld.mod.c
helloworld.mod.o
Module.symvers
modules.order
```

其中：

- `.ko`：最终的内核模块文件。
- `.o`：编译产生的目标文件。
- `.mod.c`：由构建系统生成的模块元信息相关代码。
- `Module.symvers`：记录模块构建过程中涉及的符号版本信息。

这些中间文件由 Kbuild 管理，通常不需要手动修改。

## 3.5 加载和卸载模块

Linux 提供了多种模块管理工具。

**1. insmod：加载模块**

```bash
sudo insmod helloworld.ko
```

`insmod` 直接加载指定的模块文件。

它不会自动解析并加载模块所依赖的其他模块。

**2. rmmod：卸载模块**

```bash
sudo rmmod helloworld
```

注意，通常传入模块名称，而不是 `.ko` 文件路径。

**3. 查看内核日志**

```bash
sudo dmesg
```

输出：

```text
[15616.293043] Hello world!
[15617.748606] End of the world
```

这说明模块初始化和退出函数都成功执行了。

**4. 查看当前已加载模块**

```bash
lsmod
```

或者：

```bash
cat /proc/modules
```

**5. modprobe：加载模块及其依赖**

```bash
sudo modprobe helloworld
```

`modprobe` 与 `insmod` 的主要区别：

- `insmod`：直接加载指定的模块文件，不负责自动解决模块依赖。
- `modprobe`：根据模块依赖关系自动加载所需模块。

`modprobe` 主要依赖 `/lib/modules/$(uname -r)/` 下的模块索引和依赖信息，这些信息可以通过 `depmod` 生成。

因此，`modprobe` 通常用于系统正常运行时的模块管理，而 `insmod` 更适合模块开发和测试。


# 四、内核模块参数

## 4.1 为什么需要模块参数？

很多内核模块需要根据实际使用场景调整运行行为。

例如：

- 网络驱动程序可能需要配置缓冲区大小。
- 设备驱动程序可能需要指定设备参数。
- 调试模块可能需要开启或关闭调试日志。

如果每次修改参数都需要重新编译模块，就会降低开发效率。

因此，Linux 提供了模块参数机制，允许在加载模块时传入参数。

## 4.2 module_param 宏

使用 `module_param()` 宏定义模块参数：

```c
module_param(name, type, perm);
```

三个参数：

- `name`：模块参数对应的变量名称。
- `type`：参数类型。
- `perm`：参数在 `/sys/module/模块名/parameters/` 下对应 sysfs 文件的访问权限。

常见参数类型：

| 类型 | 含义 |
|---|---|
| `bool` | 布尔值 |
| `charp` | 字符指针 |
| `byte` | 字节 |
| `short` | 短整型 |
| `ushort` | 无符号短整型 |
| `int` | 整型 |
| `uint` | 无符号整型 |
| `long` | 长整型 |
| `ulong` | 无符号长整型 |

其中，`charp` 表示字符指针，适合接收字符串参数。

## 4.3 参数权限

`perm` 用于指定模块参数对应 sysfs 文件的权限。

常见权限宏：

- `S_IRUSR`：文件所有者可读。
- `S_IWUSR`：文件所有者可写。
- `S_IXUSR`：文件所有者可执行。
- `S_IRGRP`：所属组可读。
- `S_IWGRP`：所属组可写。
- `S_IROTH`：其他用户可读。
- `S_IWOTH`：其他用户可写。

例如：

```c
module_param(myint, int, 0444);
```

表示参数文件对所有用户只读。

也可以使用：

```c
module_param(myint, int, 0644);
```

表示所有者可读写，其他用户只读。

需要注意，旧代码中经常使用 `S_IRUGO` 表示所有用户可读，但现代内核开发更推荐直接使用八进制权限值，例如 `0444`。另外，参数是否能够在加载后修改，还取决于对应参数类型的设置操作及其权限。

## 4.4 数组参数

对于数组类型的参数，可以使用：

```c
module_param_array(name, type, nump, perm);
```

其中：

- `name`：数组变量名称。
- `type`：数组元素类型。
- `nump`：用于保存实际传入的数组元素数量，可以设置为 `NULL`。
- `perm`：sysfs 文件访问权限。

例如：

```c
static int myarr[3] = {0, 1, 2};

module_param_array(myarr, int, NULL, 0644);
```

## 4.5 MODULE_PARM_DESC 参数描述

为了让其他开发者了解模块参数的用途，可以使用：

```c
MODULE_PARM_DESC(name, description);
```

它为指定参数提供描述信息，可以通过 `modinfo` 查看。

## 4.6 完整示例

```c
#include <linux/init.h>
#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/moduleparam.h>

static char *mystr = "hello";
static int myint = 1;
static int myarr[3] = {0, 1, 2};
static int myarr_num;

module_param(myint, int, 0444);
module_param(mystr, charp, 0444);
module_param_array(myarr, int, &myarr_num, 0644);

MODULE_PARM_DESC(myint, "This is my int variable");
MODULE_PARM_DESC(mystr, "This is my char pointer variable");
MODULE_PARM_DESC(myarr, "This is my array of int");

MODULE_INFO(my_field_name, "What easy value");

static int __init helloworld_init(void)
{
    pr_info("Hello world with parameters!\n");
    pr_info("mystr: %s\n", mystr);
    pr_info("myint: %d\n", myint);

    pr_info("myarr:");
    for (int i = 0; i < myarr_num; i++)
        pr_cont(" %d", myarr[i]);

    pr_cont("\n");

    return 0;
}

static void __exit helloworld_exit(void)
{
    pr_info("End of the world\n");
}

module_init(helloworld_init);
module_exit(helloworld_exit);

MODULE_AUTHOR("John Madieu <john.madieu@gmail.com>");
MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("A module with parameters");
```

这里还使用了 `MODULE_INFO()` 宏，它允许添加自定义模块元信息。

与 `MODULE_PARM_DESC()` 不同，`MODULE_INFO()` 添加的是模块级别的元信息，而不是参数描述。

## 4.7 查看和传递模块参数

编译模块后，可以通过 `modinfo` 查看模块信息：

```bash
modinfo ./helloworld-params.ko
```

部分输出：

```text
filename:       ./helloworld-params.ko
license:        GPL
author:         John Madieu <john.madieu@gmail.com>
my_field_name:  What easy value
name:           helloworld_params
vermagic:       5.15.0-203-generic SMP mod_unload modversions
parm:           myint:This is my int variable (int)
parm:           mystr:This is my char pointer variable (charp)
parm:           myarr:This is my array of int (array of int)
```

其中：

- `license`：模块许可证。
- `author`：模块作者。
- `vermagic`：模块构建时记录的内核版本及相关配置标识。
- `parm`：模块参数及其描述。

加载模块时，可以通过命令行传递参数：

```bash
sudo insmod helloworld-params.ko \
    mystr="packtpub" \
    myint=15 \
    myarr=1,2,3
```

卸载模块：

```bash
sudo rmmod helloworld_params
```

查看日志：

```bash
sudo dmesg
```

预期输出：

```text
Hello world with parameters!
mystr: packtpub
myint: 15
myarr: 1 2 3
End of the world
```

**注意：参数名称必须与代码中定义的名称一致。**

例如，下面这种写法是错误的：

```bash
sudo insmod helloworld-params.ko \
    mystring="packtpub" \
    myint=15 \
    myArray=1,2,3
```

因为代码中定义的是 `mystr` 和 `myarr`，而不是 `mystring` 和 `myArray`。

## 4.8 加载后的参数管理

模块加载成功后，还可以在 sysfs 中查看参数：

```bash
ls /sys/module/helloworld_params/parameters/
```

读取参数：

```bash
cat /sys/module/helloworld_params/parameters/myint
```

对于具有写权限的参数，也可以尝试在运行时修改：

```bash
echo 20 | sudo tee /sys/module/helloworld_params/parameters/myint
```

但这只会修改参数变量的当前值，并不意味着所有模块都支持安全的运行时参数修改。具体还取决于模块参数的类型、权限以及模块本身如何使用该变量。


# 五、错误处理与消息打印

Linux 内核开发不是重复造轮子，而是在前人经验和已有内核基础设施之上进行开发。

Linux 内核经过几十年的演进，已经形成了一套成熟的编程规范和基础设施。开发者应该优先理解并复用内核已经提供的机制，而不是自行设计一套重复的错误处理、日志打印和资源管理方式。

本节重点讨论两个非常重要的方面：

1. 错误处理：如何正确报告错误，以及如何保证资源能够被正确释放。
2. 消息打印：如何按照内核规范输出日志，以及如何选择合适的日志接口。

这两点与普通用户空间程序的开发存在明显区别。

## 5.1 错误处理

### 5.1.1 为什么内核需要严格的错误处理？

在用户空间编写程序时，发生错误通常可以通过返回错误码、释放资源或者退出进程来处理。

但在内核中，情况要复杂得多。

内核代码直接管理硬件设备、内存、进程和各种内核数据结构。一个错误如果没有被正确处理，可能导致：

- 内存泄漏。
- 设备资源没有释放。
- 硬件处于不一致状态。
- 其他内核组件无法正常工作。
- 内核崩溃甚至整个系统无法运行。

因此，内核开发必须重视两个方面：

- **正确报告错误**：返回与实际错误相对应的错误码。
- **正确回滚操作**：发生错误时，撤销此前已经完成的操作，释放所有已申请的资源。

### 5.1.2 内核预定义错误码

Linux 内核已经定义了大量标准错误码，可以覆盖绝大多数常见错误场景。

这些错误码主要定义在：

```text
include/uapi/asm-generic/errno-base.h
include/uapi/asm-generic/errno.h
```

其中，`errno-base.h` 定义了一些基础错误码：

| 错误码 | 数值 | 含义 |
|---|---:|---|
| `EPERM` | 1 | Operation not permitted |
| `ENOENT` | 2 | No such file or directory |
| `ESRCH` | 3 | No such process |
| `EINTR` | 4 | Interrupted system call |
| `EIO` | 5 | I/O error |
| `ENXIO` | 6 | No such device or address |
| `E2BIG` | 7 | Argument list too long |
| `EBADF` | 9 | Bad file number |
| `EAGAIN` | 11 | Try again |
| `ENOMEM` | 12 | Out of memory |
| `EACCES` | 13 | Permission denied |
| `EFAULT` | 14 | Bad address |
| `EBUSY` | 16 | Device or resource busy |
| `EEXIST` | 17 | File exists |
| `ENODEV` | 19 | No such device |

完整列表可以在上述头文件中查看。

内核代码通常使用负数形式的错误码：

```c
return -ENOMEM;
```

而不是：

```c
return ENOMEM;
```

这是因为 Linux 内核通常约定：

- 返回 `0` 表示成功。
- 返回负数表示失败，负数的绝对值对应具体错误码。
- 某些函数也会返回正数表示成功时的特殊结果或状态，具体取决于接口约定。

例如，设备初始化时发生 I/O 错误：

```c
dev = init_device();

if (!dev)
    return -EIO;
```

这里的 `-EIO` 表示设备初始化过程中发生了输入输出错误。

**核心原则：不要随意选择错误码。**

应该根据实际失败原因返回最合适的错误码，否则调用者可能对错误作出错误判断，进而执行不恰当的处理逻辑。

### 5.1.3 错误码如何传递到用户空间？

内核错误有时会跨越内核空间，传播到用户空间。

例如，用户程序调用：

- `open()`
- `read()`
- `write()`
- `ioctl()`
- `mmap()`

如果对应的系统调用发生错误，内核会将错误码转换为用户空间能够理解的形式。

对于通过标准系统调用接口返回的错误，用户空间通常可以通过全局变量 `errno` 获取错误信息。

例如：

```c
#include <stdio.h>
#include <errno.h>
#include <string.h>

if (write(fd, buf, 1) < 0) {
    printf("Something went wrong: %s\n", strerror(errno));
}
```

这里：

- 内核返回负错误码，例如 `-EIO`。
- 系统调用边界将其转换为用户空间的失败返回值。
- 用户空间的 `errno` 被设置为对应的正数错误码。
- `strerror(errno)` 将错误码转换为可读的错误描述。

需要注意，`errno` 是用户空间的错误处理机制，不应该直接在内核代码中使用。

### 5.1.4 使用 goto 进行错误回滚

内核开发中，一个非常常见的场景是：函数需要依次申请多个资源，如果中间某一步失败，就必须释放之前已经成功申请的资源。

例如：

```c
static int __init my_init(void)
{
    int ret = 0;
    void *ptr;

    ptr = kmalloc(sizeof(device_t), GFP_KERNEL);
    if (!ptr) {
        ret = -ENOMEM;
        goto err_alloc;
    }

    if (init_device(ptr)) {
        ret = -EIO;
        goto err_init;
    }

    if (register_device(ptr)) {
        ret = -EBUSY;
        goto err_register;
    }

    return 0;

err_register:
    cleanup_device(ptr);
err_init:
    kfree(ptr);
err_alloc:
    return ret;
}
```

上面的代码展示了 Linux 内核中常见的错误处理方式：使用 `goto` 统一处理资源清理。

这里需要特别注意清理标签的排列顺序：

- `err_register`：清理设备初始化完成后的资源。
- `err_init`：释放动态申请的内存。
- `err_alloc`：返回错误码。

如果 `register_device()` 失败，就会从 `err_register` 开始依次执行清理操作。

如果 `init_device()` 失败，则直接跳到 `err_init`，只释放已经成功申请的内存。

如果内存分配失败，则直接返回，不需要清理任何资源。

**为什么内核开发中推荐使用 goto？**

假设一个函数需要依次完成四个初始化操作：

```c
if (ops1() == ERR)
    return -EIO;

if (ops2() == ERR)
    return -EIO;

if (ops3() == ERR)
    return -EIO;

if (ops4() == ERR)
    return -EIO;
```

如果每一步都申请了资源，那么这种写法就会遇到问题：发生错误时，必须知道前面哪些操作已经成功，并逐一清理。

一种容易使代码变得复杂的方式是多层嵌套：

```c
if (ops1() == SUCCESS) {
    if (ops2() == SUCCESS) {
        if (ops3() == SUCCESS) {
            if (ops4() == SUCCESS) {
                /* All operations succeeded */
            }
        }
    }
}
```

随着初始化步骤增加，代码缩进会越来越深，错误处理也越来越难以维护。

而使用 `goto`，可以让正常执行路径保持线性，同时将错误处理集中在函数末尾：

```c
if (ops1() == ERR)
    goto error1;

if (ops2() == ERR)
    goto error2;

if (ops3() == ERR)
    goto error3;

if (ops4() == ERR)
    goto error4;

/* All operations succeeded */
return 0;

error4:
    cleanup3();
error3:
    cleanup2();
error2:
    cleanup1();
error1:
    return -EIO;
```

这就是为什么 `goto` 在 Linux 内核中并不是一种应该避免的语法，而是一种被广泛采用的资源清理手段。

不过，需要遵循以下原则：

- 主要用于函数内部的错误处理和资源回滚。
- 通常只向后跳转到统一的清理标签。
- 清理顺序应当与资源申请顺序相反。
- 不应该使用 `goto` 代替正常循环或者复杂的流程控制。

**本质上，goto 的价值在于让资源释放路径清晰、集中且不容易遗漏。**

### 5.1.5 错误指针：ERR_PTR、IS_ERR 和 PTR_ERR

在内核开发中，有时函数需要返回一个指针，但又需要同时表达操作失败的具体原因。

如果函数仅仅返回 `NULL`，调用者只能知道操作失败，却无法知道失败的具体原因。

例如：

```c
struct device *create_device(void)
{
    /* Allocation failed */
    return NULL;
}
```

调用者无法区分究竟是内存不足、设备不存在，还是其他原因。

为此，Linux 内核提供了一套特殊的错误指针机制：

```c
ERR_PTR(error)
IS_ERR(ptr)
PTR_ERR(ptr)
```

它们的定义可以在 `include/linux/err.h` 中找到。

**1. ERR_PTR()**

将负错误码编码为一个指针：

```c
return ERR_PTR(-ENOMEM);
```

可以理解为：使用指针返回值携带错误信息。

**2. IS_ERR()**

检查指针是否是错误指针：

```c
if (IS_ERR(ptr))
    /* Handle error */
```

**3. PTR_ERR()**

从错误指针中提取原始错误码：

```c
return PTR_ERR(ptr);
```

例如：

```c
static struct iio_dev *indio_dev_setup(void)
{
    struct iio_dev *indio_dev;

    indio_dev = devm_iio_device_alloc(
        &data->client->dev,
        sizeof(data)
    );

    if (!indio_dev)
        return ERR_PTR(-ENOMEM);

    return indio_dev;
}
```

调用者：

```c
static int foo_probe(...)
{
    struct iio_dev *my_indio_dev;

    my_indio_dev = indio_dev_setup();

    if (IS_ERR(my_indio_dev))
        return PTR_ERR(my_indio_dev);

    /* Continue initialization */

    return 0;
}
```

这样，函数就能够同时返回正常指针和具体错误信息。

**需要注意：**

- `ERR_PTR()` 只能用于符合内核错误指针约定的场景。
- `IS_ERR()` 用于检查错误指针，不能用来检查普通的 `NULL`。
- 如果一个接口可能返回 `NULL` 或错误指针，就需要同时处理这两种情况。
- 不要直接解引用错误指针。

### 5.1.6 函数返回值的设计规范

Linux 内核开发中，还有一个值得注意的编码习惯：

**如果函数名称表示一个动作或命令，通常返回整型错误码；如果函数名称表示一个判断或谓词，通常返回布尔值。**

例如：

```c
int add_work(...);
```

`add_work()` 表示执行一个动作，通常通过返回值报告执行结果。

而：

```c
bool pci_dev_present(...);
```

表示判断某个条件是否成立，通常返回 `true` 或 `false`。

需要注意，这是一种常见的设计习惯，而不是所有内核 API 都必须遵循的绝对规则。具体返回类型和返回值语义应以函数接口定义为准。

## 5.2 消息打印

### 5.2.1 printk 与日志级别

除了向调用者返回错误码，消息打印也是内核开发中最重要的调试手段之一。

在用户空间中，我们通常使用：

```c
printf("Hello world\n");
```

而在内核空间中，对应的底层日志接口是：

```c
printk(KERN_INFO "Hello world\n");
```

`printk()` 允许开发者根据消息的重要程度指定日志级别。

日志级别定义在：

```text
include/linux/kern_levels.h
```

之前已经介绍过 `KERN_EMERG` 到 `KERN_DEBUG` 这八个级别。

通过 `dmesg` 可以查看内核环形缓冲区中的日志。

### 5.2.2 使用辅助打印接口

虽然 `printk()` 仍然是内核底层的日志打印 API，但在现代 Linux 内核开发中，通常推荐使用具有明确语义的辅助打印接口。

这些接口可以根据不同的使用场景自动选择合适的日志级别，并且能够携带设备上下文信息。

主要包括三类：

**1. pr_<level>()：常规模块使用**

适用于普通内核模块和不需要特定设备上下文的代码。

例如：

```c
pr_emerg("Emergency message\n");
pr_alert("Alert message\n");
pr_crit("Critical message\n");
pr_err("Error message\n");
pr_warn("Warning message\n");
pr_notice("Notice message\n");
pr_info("Information message\n");
pr_debug("Debug message\n");
```

例如：

```c
static int __init hello_init(void)
{
    pr_info("Module initialized\n");
    return 0;
}
```

**2. dev_<level>()：设备驱动程序使用**

对于具有 `struct device` 设备上下文的驱动程序，推荐使用 `dev_<level>()` 系列接口。

例如：

```c
dev_info(dev, "Device initialized\n");
dev_err(dev, "Failed to initialize device\n");
dev_warn(dev, "Unexpected device state\n");
dev_dbg(dev, "Debug information\n");
```

这里的 `dev` 是对应设备的 `struct device *` 指针。

与普通 `pr_info()` 相比，`dev_info()` 可以自动携带设备相关信息，使日志更容易定位到具体设备。

例如，在系统存在多个相同型号设备时，设备上下文尤其有用。

**3. netdev_<level>()：网络设备驱动程序使用**

对于网络设备驱动程序，推荐使用 `netdev_<level>()` 系列接口。

例如：

```c
netdev_info(dev, "Network device initialized\n");
netdev_err(dev, "Failed to initialize network device\n");
netdev_warn(dev, "Unexpected network state\n");
netdev_dbg(dev, "Debug information\n");
```

这里的 `dev` 是 `struct net_device *` 类型的网络设备指针。

这类接口能够自动携带网络设备名称等上下文信息。

### 5.2.3 三类日志接口如何选择？

| 使用场景 | 推荐接口 | 设备上下文 |
|---|---|---|
| 普通内核模块 | `pr_<level>()` | 无 |
| 普通设备驱动 | `dev_<level>()` | `struct device *` |
| 网络设备驱动 | `netdev_<level>()` | `struct net_device *` |

例如：

```c
/* 普通内核模块 */
pr_info("Module loaded\n");

/* 普通设备驱动 */
dev_info(&pdev->dev, "Device initialized\n");

/* 网络设备驱动 */
netdev_info(netdev, "Network device started\n");
```

对于普通设备驱动，使用 `dev_*()` 能够让日志自动携带设备上下文；对于网络驱动，则应该优先使用 `netdev_*()`。

**核心思想：日志不仅要说明发生了什么，还应该尽可能说明是哪个设备发生了什么。**

这样在多设备、多驱动的复杂系统中，才能更容易定位问题。


# 六、符号导出与模块依赖

## 6.1 为什么需要符号导出？

Linux 内核由大量子系统和模块组成，它们之间经常需要相互调用函数或者访问共享数据。

例如：

- 模块 A：提供一个函数 `my_func()`。
- 模块 B：需要调用模块 A 中的 `my_func()`。

但是，内核默认不会允许一个模块直接访问另一个模块中所有的内部函数和变量。

只有显式导出的符号，才能被其他模块引用。

Linux 提供了两个常见宏：

```c
EXPORT_SYMBOL(symbol);
EXPORT_SYMBOL_GPL(symbol);
```

**EXPORT_SYMBOL**

将指定符号导出，使其他模块可以引用。

**EXPORT_SYMBOL_GPL**

同样用于导出符号，但只允许 GPL 兼容许可证的模块使用。

如果非 GPL 兼容模块尝试引用仅通过 `EXPORT_SYMBOL_GPL` 导出的符号，内核通常会拒绝加载。

## 6.2 如何导出函数？

模块 A：

```c
#include <linux/module.h>
#include <linux/kernel.h>

void my_func(void)
{
    pr_info("my_func is called\n");
}

EXPORT_SYMBOL(my_func);

static int __init module_a_init(void)
{
    pr_info("module A loaded\n");
    return 0;
}

static void __exit module_a_exit(void)
{
    pr_info("module A unloaded\n");
}

module_init(module_a_init);
module_exit(module_a_exit);

MODULE_LICENSE("GPL");
```

## 6.3 模块 B 如何引用？

创建公共头文件 `my_export.h`：

```c
#ifndef MY_EXPORT_H
#define MY_EXPORT_H

void my_func(void);

#endif
```

模块 B：

```c
#include <linux/module.h>
#include <linux/kernel.h>
#include "my_export.h"

static int __init module_b_init(void)
{
    pr_info("module B loaded\n");

    my_func();

    return 0;
}

static void __exit module_b_exit(void)
{
    pr_info("module B unloaded\n");
}

module_init(module_b_init);
module_exit(module_b_exit);

MODULE_LICENSE("GPL");
```

这里需要区分两个概念：

- 头文件中的函数声明解决编译阶段的类型检查问题。
- `EXPORT_SYMBOL()` 解决模块之间的符号可见性问题。

仅仅在头文件中声明函数，并不能让其他模块真正获得该函数的实现。

## 6.4 模块依赖关系

当模块 B 使用模块 A 导出的符号时，就意味着模块 B 依赖模块 A。

因此：

1. 必须先加载模块 A。
2. 然后才能加载模块 B。
3. 如果模块 B 仍在使用模块 A 提供的符号，就不能正常卸载模块 A。

内核通过模块引用计数等机制管理这种依赖关系。

## 6.5 Module.symvers 的作用

`Module.symvers` 记录内核或模块构建过程中导出的符号及其相关信息，特别是在启用 `CONFIG_MODVERSIONS` 时用于符号 CRC 版本检查。

例如：

```text
0x12345678    my_func    module_a    EXPORT_SYMBOL
```

包含：

- 符号 CRC。
- 符号名称。
- 符号所属模块。
- 导出类型。

注意：`Module.symvers` 不是运行时内核的全局符号表，而是构建阶段使用的符号信息文件。

真正运行时的符号查找由内核模块加载机制完成。

## 6.6 如何正确构建存在依赖关系的模块？

如果模块 A 和模块 B 都是外部模块，可以将它们放在同一个 Kbuild Makefile 中：

```makefile
obj-m := module_a.o module_b.o

KERNELDIR ?= /lib/modules/$(shell uname -r)/build

all:
	$(MAKE) -C $(KERNELDIR) M=$(PWD) modules

clean:
	$(MAKE) -C $(KERNELDIR) M=$(PWD) clean
```

如果模块 A 和模块 B 分开构建，则需要向模块 B 的构建过程提供模块 A 的 `Module.symvers`：

```makefile
KBUILD_EXTRA_SYMBOLS += /path/to/module_a/Module.symvers
```

模块安装到系统后，可以执行：

```bash
sudo depmod -a
```

之后通过：

```bash
sudo modprobe module_b
```

由 `modprobe` 根据依赖关系自动加载模块 A 和模块 B。


# 七、常用内核模块管理命令

| 命令 | 作用 |
|---|---|
| `insmod` | 加载指定的模块文件 |
| `rmmod` | 卸载指定的内核模块 |
| `modprobe` | 加载模块并自动处理依赖 |
| `lsmod` | 查看当前已加载的模块 |
| `modinfo` | 查看模块元信息 |
| `depmod` | 生成或更新模块依赖及符号映射信息 |
| `dmesg` | 查看内核环形缓冲区日志 |

常见使用示例：

```bash
# 编译模块
make

# 加载模块
sudo insmod helloworld.ko

# 查看模块信息
modinfo helloworld.ko

# 查看已加载模块
lsmod

# 查看模块依赖
modprobe --show-depends helloworld

# 卸载模块
sudo rmmod helloworld

# 查看内核日志
sudo dmesg

# 实时监控内核日志
sudo dmesg -w

# 更新模块依赖信息
sudo depmod -a

# 清理构建文件
make clean
```


# 八、总结

本章主要介绍了 Linux 内核模块的基本开发流程，以及内核开发中需要遵循的一些重要规范。

从开发角度来看，一个内核模块通常需要经历以下过程：

1. 编写模块源代码，定义初始化函数和退出函数。
2. 使用 `module_init()` 和 `module_exit()` 注册模块入口和出口。
3. 使用 Kbuild 编译模块，生成 `.ko` 文件。
4. 使用 `insmod` 或 `modprobe` 加载模块。
5. 模块初始化函数执行，完成资源申请和功能注册。
6. 模块正常运行，通过日志和调试工具进行分析。
7. 使用 `rmmod` 卸载模块，执行退出函数并释放资源。

需要重点理解的概念：

- 内核模块是 Linux 内核实现模块化扩展的重要机制。
- `__init` 和 `__exit` 用于标记模块初始化和退出阶段的代码。
- `module_init()` 和 `module_exit()` 用于注册模块生命周期入口。
- `module_param()` 和 `module_param_array()` 用于定义模块参数。
- `EXPORT_SYMBOL()` 和 `EXPORT_SYMBOL_GPL()` 用于导出模块可以使用的符号。
- `Module.symvers` 用于构建阶段的符号信息和版本检查。
- Kbuild 是构建 Linux 内核及外部模块的核心构建系统。
- 内核错误处理必须保证错误码准确，并且正确回滚已经申请的资源。
- 内核日志应该根据使用场景选择 `pr_*()`、`dev_*()` 或 `netdev_*()`。

**最后，内核开发不是重复造轮子，而是在前人积累的经验和内核已有基础设施之上进行开发。**

学习 Linux 内核时，不仅要理解某个 API 如何使用，更应该学会阅读内核源码，寻找已有子系统和驱动程序中的成熟实现，理解它们为什么采用这样的设计。
