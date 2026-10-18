---
title: "一生一芯-F3阶段笔记"
date: '2026-10-17T15:42:02+08:00'
draft: false
tags: [处理器, RISC-V,]
categories: [一生一芯]
---

> **处理器芯片本质上是数字电路**。数字电路是用来处理**数字信号**的电路, 而**数字信号简单来说是指`0`和`1`这两种离散的信号**. 这里的`0`和`1`并不是数学意义上的自然数, 它是指**信号的两种不同状态**, 为了简单叙述, 就分别称它们为`0`和`1`. 为了和数学上的`0`和`1`区分开来, 有时候也将上面两种状态称为`逻辑0`和`逻辑1`。
> 

因此, 处理器芯片本质上也是处理`0`和`1`这两种信号的芯片. 要学习处理器芯片设计, 数字电路的知识是基础. 而要学习数字电路, 就是需要学习信息在数字电路中是如何表示, 处理和存储的。具体地, 你将会了解:

- 如何表示 - 数字信号`0`和`1`在数字电路中的物理含义
- 如何处理 - 门电路和组合逻辑电路的工作原理
- 如何存储 - 时序逻辑电路的工作原理

# 课程笔记

## 1. 如何表示0和1？

> **关键问题：数字电路如何表示0和1（物理含义），以及如何处理它们？**
> 

- **数字电路用物理量的两个离散区间表示 0 和 1**：最常见的是低电平=0、高电平=1，并用阈值区间和噪声容限保证在真实电路中可靠区分，而不是依赖精确的单一电压值。
- **使用晶体管处理数字信号**：一个晶体管包含三个极（Source、Drain和Gate），其作用类似于一个开关，通过在Gate端加入不同电压可以控制Source和Drain的导通与断开。

![](/images/posts/ysyx-f3/image.png)

## 2. CMOS

在实际的硬件设计中，通常使用一个nMOS和一个pMOS构造CMOS来实现0和1。

下面这个CMOS本身其实是一个反相器，即输入A为0，输出Y为1；输入A为1，输出Y为0。

![](/images/posts/ysyx-f3/image%201.png)

> **关键问题：一个晶体管就能作为开关，为什么要用两个晶体管构成CMOS？**
> 

单看逻辑功能，一个 nMOS 确实就能当开关用——栅极给高电平导通、给低电平截止。那为什么几乎所有的现代数字电路都用 CMOS（互补金属氧化物半导体，即 nMOS + pMOS 配对）而不是单管方案？

- nMOS擅长传递低电平，pMOS擅长传递高电平，反过来会导致信号衰减。
- CMOS的静态功耗低。
- CMOS的互补结构使高低电平的噪声容限对称、较大。
- CMOS 工艺中 NMOS 和 PMOS 可以成对制造，版图规整、易于自动布局布线，也便于用标准单元库大规模综合。单管方案往往需要电阻、特殊器件，难以标准化和缩放。

![](/images/posts/ysyx-f3/image1.png)

**虽然一个晶体管也能"通断"，但只有 nMOS + pMOS 互补配对，才能同时做到：完整传递 0 和 1、主动驱动、静态几乎不耗电、电平可恢复、易于大规模集成。** CMOS 不是"两个管子干一个管子的活"的浪费，而是用互补换来了功耗、电平、可靠性、可扩展性的全面胜利。

## 3. 使用CMOS构建逻辑门电路
与非门：

![](/images/posts/ysyx-f3/image%202.png)

或非门：

![](/images/posts/ysyx-f3/image%203.png)

## 4. 基本的组合逻辑电路

**译码器：**

![](/images/posts/ysyx-f3/image%204.png)

**编码器：**

![](/images/posts/ysyx-f3/image%205.png)

**优先编码器：**

![](/images/posts/ysyx-f3/image%206.png)

**多路选择器：**

![](/images/posts/ysyx-f3/image%207.png)

**比较器：使用异或门来进行判等**

![](/images/posts/ysyx-f3/image%208.png)

**半加器和全加器：**

![](/images/posts/ysyx-f3/image%209.png)

**行波多位加法器：多个1位加法器串联而成**

![](/images/posts/ysyx-f3/image%2010.png)

![](/images/posts/ysyx-f3/image%2011.png)

# 一、门电路

## MOS

nMOS和pMOS：

![](/images/posts/ysyx-f3/image%2012.png)

CMOS：下面表示的是一个反相器

![](/images/posts/ysyx-f3/image%2013.png)

练习题：

![](/images/posts/ysyx-f3/image%2014.png)

分析：

- A或B任意一个为高电平时，Y都会输出低电平
- A和B均为低电平时，Y输出为高电平

综上可知，该电路是一个或非门。

![](/images/posts/ysyx-f3/image%2015.png)

> 在草稿纸上已完成。
> 

![](/images/posts/ysyx-f3/image%2016.png)

> 一个与门需要6个晶体管，一个与非门需要4个晶体管。
> 

前者使用门电路来搭建目标电路，需要10个晶体管。而后者通过全定制策略来搭建目标电路，仅需要6个晶体管。

<aside>
💡

在真实项目中，使用卡诺图来化简表达效率很低，现代工具通常会采用QMC算法或者espresso算法来对逻辑表达式进行化简, 因此, 很少需要对逻辑表达式进行手动化简。

</aside>

## 异或门

![](/images/posts/ysyx-f3/image%2017.png)

![](/images/posts/ysyx-f3/image%2018.png)

> 一个非门需要2个晶体管，一个与门需要6个晶体管，一个或门需要6个晶体管。
> 

总共需要 2 + 2 + 6 + 6 + 6 = 22个晶体管。

下面使用与非门重新构建异或电路，仅需4 + 4 + 4 + 2 + 2 = 16个晶体管。

![](/images/posts/ysyx-f3/image%2019.png)

![](/images/posts/ysyx-f3/image%2020.png)

使用全定制仅需6个晶体管就能搭建一个异或门电路。

## 同或门

![](/images/posts/ysyx-f3/image%2021.png)

![](/images/posts/ysyx-f3/image%2022.png)

总共需要 4 + 4 + 4 + 2 + 2 = 16个晶体管。


# 二、组合逻辑电路

## 译码器

译码器类似于one-hot编码：

![](/images/posts/ysyx-f3/image%2023.png)

使用logisim实现一个2-4译码器：

![](/images/posts/ysyx-f3/image%2024.png)

学习创建子电路：

![](/images/posts/ysyx-f3/image%2025.png)

在project中点击 “创建电路” ： 

![](/images/posts/ysyx-f3/image%2026.png)

![](/images/posts/ysyx-f3/image%2027.png)

使用两个24译码器，然后在输出端根据输出C控制输出：

![](/images/posts/ysyx-f3/image%2028.png)

![](/images/posts/ysyx-f3/image%2029.png)

要求搭建一个七段数码管译码器，将4位的输入映射到7段数码管的8位输出上，以表示0-15这16个数字。

- 首先根据0-15这16个数字按七段数码管中的显示方式构建输入到输出的真值表
- 使用logisim中的**分析电路功能**，将真值表导入，然后自动生成电路图
- 最后使用logisim中的七段数码管来仿真检查译码电路的正确性

![](/images/posts/ysyx-f3/image%2030.png)

## 编码器

**16-4编码器的实现**：思路是使用**4个或门**将所有可能使某位为1的值全部接入到对应或门的输入中（例如想要`Y3`为1，则输入的值必然为8～15）。

![](/images/posts/ysyx-f3/image%2031.png)

结合先前实现的七段数码管解码器来检测一下效果：

![](/images/posts/ysyx-f3/image%2032.png)

## 优先编码器

所谓优先编码器是指，**当输入数据不遵循one-hot编码，而是同时存在多个值为1的输入时**，显示最高位作为输入值，这与普通编码器是不同的。

$$
Y_1 = I_2+I_3
$$

$$
Y_0 = I_3+(\overline {I_3} ·\overline{I_2}·I_1)
$$

![](/images/posts/ysyx-f3/image%2033.png)

可以看到当`X1`和`X2`同时为`1`时，输出仅考虑高位者。

## 多路选择器

![](/images/posts/ysyx-f3/image%2034.png)

$$
Y=A\overline{S}+BS
$$

![](/images/posts/ysyx-f3/image%2035.png)

![](/images/posts/ysyx-f3/image%2036.png)

前面我们构造了一个1位的2选1电路（Mux2_1），现在对其进行扩展，让它支持3位的2选1（Mux2_3）：

![](/images/posts/ysyx-f3/image%2037.png)

利用Mux2_3来构造3位的4选1电路（Mux4_3）：

![](/images/posts/ysyx-f3/image%2038.png)

![](/images/posts/ysyx-f3/image%2039.png)

我的思路：先实现一个4-16的解码器，然后在其`16`个输出引脚中通过**选择位S**+**与门**来控制第`10-15`号输出是否允许，随后接入16-4编码器 + 七段数码管解码器。

![](/images/posts/ysyx-f3/image%2040.png)

## 比较器

![](/images/posts/ysyx-f3/image%2041.png)

**“异或门 + 非门”** 可以用来表示两个bits相等，4位比较器可以用4个这种组合来实现：

![](/images/posts/ysyx-f3/image%2042.png)

## 加法器

先构造半加器：

![](/images/posts/ysyx-f3/image%2043.png)

然后利用两个半加器来构建全加器：

- A + B + Cin 的和 S1 等于连续两个半加器的输出S2
- cout为两个半加器的C求或

![](/images/posts/ysyx-f3/image%2044.png)

![](/images/posts/ysyx-f3/image%2045.png)

使用前面搭建的全加器构建4位加法器：

![](/images/posts/ysyx-f3/image%2046.png)

然后使用七段数码管来测试所搭建的4位加法器：

![](/images/posts/ysyx-f3/image%2047.png)

# 三、整数的机器表示

## 减法器

![](/images/posts/ysyx-f3/image%2048.png)

先实现一个整数取反的电路：

![](/images/posts/ysyx-f3/image%2049.png)

再利用它与全加器构造减法器：

![](/images/posts/ysyx-f3/image%2050.png)

## 原码

![](/images/posts/ysyx-f3/image%2051.png)

思考：假设现在有两个4位原码表示的整数A和B

- 若A和B均为正数，直接用加法器计算A+B
- 若A为负数，B为正数，使用减法器进行 A - B取反
- 若A为正数，B为负数，使用减法器进行 A - B
- 若A为负数，B为负数，A + B的结果取反

> 暂不做
> 

## 补码加法的益处检测

溢出 = 相加的两个数符号相同 + 次高位进位与最高位进位不同

# 四、时序逻辑电路

组合逻辑电路的特点：当前的输出仅取决于当前的输入。因此**组合逻辑电路是无记忆的**。

而时序逻辑电路的输出不仅依赖于当前输入，还依赖于先前的状态，其特性有：

- 包含一组状态变量，来记录电路先前的状态
- 可以读出电路的旧状态
- 可以更新电路的状态

## 交替反相器

![](/images/posts/ysyx-f3/image%2052.png)

## SR锁存器

交替反相器难以使用，因此更进一步构造SR锁存器：

![](/images/posts/ysyx-f3/image%2053.png)

![](/images/posts/ysyx-f3/image%2054.png)

![](/images/posts/ysyx-f3/image%2055.png)

![](/images/posts/ysyx-f3/image%2056.png)

从`11`变为`00`，触发震荡：

![](/images/posts/ysyx-f3/image%2057.png)

## D锁存器

在S-R锁存器中， 当**S和R同时从1跳变到0的那一瞬间**，可能出现“亚稳态”，即电路出现震荡。

针对这一问题进行改进，构建出了D锁存器，通过WE输入来实现状态保持，而输入D + 非门来保证不存在`S=1`且`R=1`的输入情况出现。

![](/images/posts/ysyx-f3/image%2058.png)

当WE为0时，S R锁存器的输入S和R均为0，锁存器保持原来的状态不变。

当WE为1时，开始允许改变锁存器的状态：

- D为1时，S=1，R=0，将锁存器的值置为1
- D为0时，S=0，R=1，将锁存器的值置为0

![](/images/posts/ysyx-f3/image%2059.png)

![](/images/posts/ysyx-f3/image%2060.png)

![](/images/posts/ysyx-f3/image%2061.png)

![](/images/posts/ysyx-f3/image%2062.png)

![](/images/posts/ysyx-f3/image%2063.png)

![](/images/posts/ysyx-f3/image%2064.png)

![](/images/posts/ysyx-f3/image%2065.png)

之所以会出现震荡，是因为模拟器没有时间的概念，向这样直接将元器件的输出接到输入就会直接报震荡。

## 同步电路

在具有多个逻辑模块的电路中，我们希望输入数据按照给定的顺序经过各个逻辑模块。

- **同步电路**：通过全局时钟信号来实现同步关系
    - 存储单元仅在时钟边沿到达时写入数据
    - 在后续时钟周期中稳定读出该数据
- **异步电路**：通过模块之间的局部通信信号实现同步关系

> 关键问题：仅靠D锁存器无法实现同步电路的特性。
> 

![](/images/posts/ysyx-f3/image%2066.png)

![](/images/posts/ysyx-f3/image%2067.png)

## D触发器

**D锁存器是水平触发（电平触发）的**：只要WE有效，输入信号D一旦发生变化，输出立刻随之变化。

![](/images/posts/ysyx-f3/image%2068.png)

这种特性其实是**电平触发**（即WE为高电平时立即根据输入改变输出），而我们期望的是**边缘触发**（即仅在电平转换的边沿才根据输入改变输出，其它时刻都保持原状态不变）。

![](/images/posts/ysyx-f3/image%2069.png)

![](/images/posts/ysyx-f3/image%2070.png)

<aside>
💡

注意：这里的clk是I/O中的时钟组件，用于测试。而在Logisim封装芯片时要使用普通输入，然后将name设置为CLK，不然无法在封装后的芯片中看到时钟引脚。

</aside>

我的分析：

- **在clk为0时**，第一个D锁存器导通，将其值修改为输入数据D，第二个锁存器保持原状态，因此输出也保持不变
- **然后clk变为1**，第一个D锁存器保持原状态，第二个D锁存器导通，将其值修改为第一个锁存器保存的值。

> 意义：通过一个统一的时钟信号实现了稳定的bit存储。
> 

![](/images/posts/ysyx-f3/image%2071.png)

![](/images/posts/ysyx-f3/image%2072.png)

![](/images/posts/ysyx-f3/image%2073.png)

![](/images/posts/ysyx-f3/image%2074.png)

直接将输出取反后作为D触发器的输入，在时钟的下降沿将当前输出取反后保存到第一个D锁存器，在时钟上升沿将取反后到结果存入第二个D锁存器，此时D触发器的输出发生改变。

![](/images/posts/ysyx-f3/image%2075.png)

想要在下降沿进行触发，只需要将clk的输入取反即可：

![](/images/posts/ysyx-f3/image%2076.png)

![](/images/posts/ysyx-f3/image%2077.png)

用一个与门结合`EN`信号与`clk`信号连接，只有在`EN`信号为`1`时才会出现边沿触发。

![](/images/posts/ysyx-f3/image%2078.png)

注意！！！！前面实现的复位功能有问题，其仅考虑将复位信号上拉时的第二个D锁存器的输出置为0，但是第一个D锁存器的值并未改变，因此在复位信号转换为低电平后，第一个D锁存器中的数据会再次传递到第二个D锁存器，导致复位失败。

我们的电路要保证在复位信号上拉后，两个D锁存器的值能同时被置为0。

## 寄存器

![](/images/posts/ysyx-f3/image%2079.png)

实现4位寄存器：本质上就是多个D触发器。

![](/images/posts/ysyx-f3/image%2080.png)

![](/images/posts/ysyx-f3/image%2081.png)

## 计数器

![](/images/posts/ysyx-f3/image%2082.png)

![](/images/posts/ysyx-f3/image%2083.png)

我在实现这个电路时除了点小问题，即开始仿真后，寄存器的输出连线都是红色，没有产生预期的输出。后来发现这是因为最开始其输出是不确定的，该值又连接到了加法器上，导致Ligisim无法工作。在启动之前需要先将复位信号R拉高，将寄存器的值初始化为0后，再进行计数。

# 五、数列求和电路

![](/images/posts/ysyx-f3/image%2084.png)

利用8位加法器进行运算，利用8位寄存器存储结果，使用先前实现的计数器来生成递增的加数。因为只需要计算1, 2, 3, … , 10的和，所以还需要额外的电路来控制加法的次数，这里我采用常数 + 比较器，通过抑制时钟信号的变化实现加法次数的控制。

![](/images/posts/ysyx-f3/image%2085.png)

再构造一个电路进行测试，结果和预期的一致：

![](/images/posts/ysyx-f3/image%2086.png)

![](/images/posts/ysyx-f3/image%2087.png)

思路和上面的数列求和电路差不多，不多叙。