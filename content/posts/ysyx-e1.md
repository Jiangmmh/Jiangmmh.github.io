---
title: "一生一芯-E1阶段笔记"
date: '2026-10-19T16:11:46+08:00'
draft: false
tags: [处理器, RISC-V, Verilog, HDL]
categories: [一生一芯]
---

在F阶段我们了解了数字电路的原理（数字信号的表示、存储和处理）和状态机模型，使用Ligisim实现了一个简单的sCPU，并在其上运行了数列求和程序。但是，Logisim的方案难以满足现代处理器设计的需求，因此在E1阶段中我将学习使用HDL（硬件描述语言）实现处理器。

我的学习路线是：先过了一遍verilog的基本语法，然后刷HDLBits中的题目。

- verilog语法简介：[https://vlab.ustc.edu.cn/guide/doc_verilog.html](https://vlab.ustc.edu.cn/guide/doc_verilog.html)
- **HDLBits** 网址：[https://hdlbits.01xz.net/wiki/Main_Page](https://hdlbits.01xz.net/wiki/Main_Page)

HDLBits提供了大量的Verilog的练习题，由浅入深，非常适合verilog的初学者。

这篇文章的内容主要是我刷HDLBits题目的笔记，请根据需要阅读。

> 这两天基本上把HDLBits中的题目全部刷了一遍，大部份题目已经吃透，少部份未能完全理解，后续有时间再复习吧。
> 

# Getting Started

## **Step one**

**H**ardware **D**escription **L**anguage（硬件描述语言）使用代码来描述数字硬件。

下面是一个最简单的示例：

```verilog
module top_module( output one );

    assign one = 1;

endmodule
```

该代码定义了一个名为top_module的module，没有输入，只有一个输出名为one，其中使用assign语句将输出端one置为1。

## **Zero**

同上，不过这里将输出端置为0。

```verilog
module top_module(
    output zero
);// Module body starts after semicolon
	assign zero = 0;
endmodule
```

# Verilog Language

## Basics

### Wire

> Create a module with one input and one output that behaves like a wire.
> 

和物理的连线（wire）不同，verilog中的连线是有方向的。

![image.png](/images/posts/ysyx-e1/image.png)

我们可以使用assign语句连接输入和输出。

```verilog
module top_module( input in, output out );
	assign out = in;
endmodule
```

### **Wire4**

> 
> 
> 
> Create a module with 3 inputs and 4 outputs that behaves like wires that makes these connections:
> 
> ```
> a -> w
> b -> x
> b -> y
> c -> z
> ```
> 

![image.png](/images/posts/ysyx-e1/image%201.png)

```verilog
module top_module( 
    input a,b,c,
    output w,x,y,z );
	
    assign w = a;
    assign x = b;
    assign y = b;
    assign z = c;
    
endmodule
```

### **Notgate**

> Create a module that implements a NOT gate.
> 

![image.png](/images/posts/ysyx-e1/image%202.png)

注意：在verilog中，`~`表示按位取反，而`!`表示逻辑取反。

```verilog
module top_module( input in, output out );

    assign out = ~in;
    
endmodule
```

### **Andgate**

> Create a module that implements an AND gate.
> 

![image.png](/images/posts/ysyx-e1/image%203.png)

```verilog
module top_module( 
    input a, 
    input b, 
    output out );
	
    assign out = a & b;
    
endmodule
```

### **Norgate**

> Create a module that implements a NOR gate.
> 

![image.png](/images/posts/ysyx-e1/image%204.png)

```verilog
module top_module( 
    input a, 
    input b, 
    output out );
	
    assign out = ~(a | b);
    
endmodule
```

### **Xnorgate**

> Create a module that implements an XNOR gate.
> 

![image.png](/images/posts/ysyx-e1/image%205.png)

在verilog中，使用 `^` 表示异或。

```verilog
module top_module( 
    input a, 
    input b, 
    output out );

    assign out = ~(a ^ b);
    
endmodule
```

### **Wire decl**

随着电路越来越复杂，可能需要将一根wire连接到多处，这就需要为wire命名，而verilog提供了这个功能。

![image.png](/images/posts/ysyx-e1/image%206.png)

```verilog
module top_module(
    input in,              // Declare an input wire named "in"
    output out             // Declare an output wire named "out"
);

    wire not_in;           // Declare a wire named "not_in"

    assign out = ~not_in;  // Assign a value to out (create a NOT gate).
    assign not_in = ~in;   // Assign a value to not_in (create another NOT gate).

endmodule   // End of module "top_module"
```

> 实现下面的电路。
> 

![image.png](/images/posts/ysyx-e1/image%207.png)

```verilog
module top_module(
    input a,
    input b,
    input c,
    input d,
    output out,
    output out_n   ); 
    
    wire ab, cd;
    assign ab = a & b;
    assign cd = c & d;
    assign out =  ab | cd;
    assign out_n = ~out;

endmodule
```

### **7458**

> Create a module with the same functionality as the 7458 chip.
> 

![image.png](/images/posts/ysyx-e1/image%208.png)

```verilog
module top_module(
    input p1a, p1b, p1c, p1d, p1e, p1f,
    output p1y,
    input p2a, p2b, p2c, p2d,
    output p2y );
    
    wire w1, w2, w3, w4;
    assign w1 = p2a & p2b;
    assign w2 = p2c & p2d;
    assign w3 = p1a & p1c & p1b;
    assign w4 = p1f & p1e & p1d;
    assign p2y = w1 | w2;
    assign p1y = w3 | w4;

endmodule
```

## Vectors

### **Vector0**

Vector用于将信号聚合成组，使其容易被操作。其定义和使用的方法如下：

```verilog
wire [99:0] my_vector;
assign out = my_vector[10];
```

> Build a circuit that has one 3-bit input, then outputs the same vector, and also splits it into three separate 1-bit outputs.
> 

![image.png](/images/posts/ysyx-e1/image%209.png)

```verilog
module top_module(
    input wire [2:0] vec,
    output wire [2:0] outv,
    output wire o2,
    output wire o1,
    output wire o0  ); // Module body starts after module declaration
    
    assign outv = vec;
    assign o0 = vec[0];
    assign o1 = vec[1];
    assign o2 = vec[2];

endmodule
```

### **Vector1**

Vector的定义惯例如下：

```verilog
type [upper:lower] vector_name;
```

其中的type指定了vector的数据类型，主要包括wire、reg和port（in和out）。

```verilog
wire [7:0] w;         // 8-bit wire
reg  [4:1] x;         // 4-bit reg
output reg [0:0] y;   // 1-bit reg that is also an output port (this is still a vector)
input wire [3:-2] z;  // 6-bit wire input (negative ranges are allowed)
output [3:0] a;       // 4-bit output wire. Type is 'wire' unless specified otherwise.
wire [0:7] b;         // 8-bit wire where b[0] is the most-significant bit.
```

还可以自行定义使用常量Vector：

```verilog
wire [2:0] a, c;   // Two vectors
assign a = 3'b101;  // a = 101
assign b = a;       // b =   1  implicitly-created wire
assign c = b;       // c = 001  <-- bug
my_module i1 (d,e); // d and e are implicitly one-bit wide if not declared.
                    // This could be a bug if the port was intended to be a vector.
```

Vector支持切片操作：

```verilog
w[3:0]      // Only the lower 4 bits of w
x[1]        // The lowest bit of x
x[1:1]      // ...also the lowest bit of x
z[-1:-2]    // Two lowest bits of z
b[3:0]      // Illegal. Vector part-select must match the direction of the declaration.
b[0:3]      // The *upper* 4 bits of b.
assign w[3:0] = b[0:3];    // Assign upper 4 bits of b to lower 4 bits of w. w[3]=b[0], w[2]=b[1], etc.
```

> Build a combinational circuit that splits an input half-word (16 bits, [15:0] ) into lower [7:0] and upper [15:8] bytes.
> 

```verilog
`default_nettype none     // Disable implicit nets. Reduces some types of bugs.
module top_module( 
    input wire [15:0] in,
    output wire [7:0] out_hi,
    output wire [7:0] out_lo );
    
    assign out_hi = in[15:8];
    assign out_lo = in[7:0];

endmodule
```

### **Vector2**

> 
> 
> 
> Build a circuit that will reverse the *byte* ordering of the 4-byte word.
> 
> ```
> AaaaaaaaBbbbbbbbCcccccccDddddddd => DdddddddCcccccccBbbbbbbbAaaaaaaa
> ```
> 

```verilog
module top_module( 
    input [31:0] in,
    output [31:0] out );

    assign out[7:0] = in[31:24];
    assign out[15:8] = in[23:16];
    assign out[23:16] = in[15:8];
    assign out[31:24] = in[7:0];
 
endmodule
```

### **Vectorgates**

> Build a circuit that has **two 3-bit inputs** that computes the **bitwise-OR of the two vectors**, the **logical-OR of the two vectors**, and the **inverse (NOT) of both vectors**.
> 

![image.png](/images/posts/ysyx-e1/image%2010.png)

```verilog
module top_module( 
    input [2:0] a,
    input [2:0] b,
    output [2:0] out_or_bitwise,
    output out_or_logical,
    output [5:0] out_not
);
    
    assign out_or_bitwise = a | b;
    assign out_or_logical = a || b;
    assign out_not[5:3] = ~b;
    assign out_not[2:0] = ~a;

endmodule
```

### **Gates4**

> 
> 
> 
> Build a combinational circuit with four inputs, in[3:0].
> 
> There are 3 outputs:
> 
> - out_and: output of a 4-input AND gate.
> - out_or: output of a 4-input OR gate.
> - out_xor: output of a 4-input XOR gate.

```verilog
module top_module( 
    input [3:0] in,
    output out_and,
    output out_or,
    output out_xor
);
    assign out_and = in[3] & in[2] & in[1] & in[0];
    assign out_or = in[3] | in[2] | in[1] | in[0];
    assign out_xor = in[3] ^ in[2] ^ in[1] ^ in[0];

endmodule
```

### **Vector3**

合并操作{a,b,c}用于将多个小的vector组合成一个大的Vector。

示例：

```verilog
{3'b111, 3'b000} => 6'b111000
{1'b1, 1'b0, 3'b101} => 5'b10101
{4'ha, 4'd10} => 8'b10101010     // 4'ha and 4'd10 are both 4'b1010 in binary
```

> 这里有6个5-bit的输入端口，和4个8-bit的输出端口，根据下图所示的结构拼接输入，得到输出。
> 

![image.png](/images/posts/ysyx-e1/image%2011.png)

```verilog
module top_module (
    input [4:0] a, b, c, d, e, f,
    output [7:0] w, x, y, z );//

    assign z = {e[0], f, 2'b11};
    assign y = {d[3:0], e[4:1]};
    assign x = {b[1:0], c, d[4]};
    assign w = {a, b[4:2]};

endmodule
```

### **Vectorr**

> Given an 8-bit input vector [7:0], reverse its bit ordering.
> 

```verilog
module top_module( 
    input [7:0] in,
    output [7:0] out
);
    
    assign out = {in[0], in[1], in[2], in[3], in[4], in[5], in[6], in[7]};

endmodule
```

### **Vector4**

verilog还支持重复拼接的简写形式`{num{vector}}`：

```verilog
{5{1'b1}}           // 5'b11111 (or 5'd31 or 5'h1f)
{2{a,b,c}}          // The same as {a,b,c,a,b,c}
{3'd5, {2{3'd6}}}   // 9'b101_110_110. It's a concatenation of 101 with
                    // the second vector, which is two copies of 3'b110
```

> 对输入in进行符号扩展得到输出out。
> 

```verilog
module top_module (
    input [7:0] in,
    output [31:0] out );

    assign out = {{24{in[7]}}, in};

endmodule
```

### **Vector5**

> 
> 
> 
> Given five 1-bit signals (a, b, c, d, and e), compute all 25 pairwise one-bit comparisons in the 25-bit output vector. The output should be 1 if the two bits being compared are equal.
> 
> ```
> out[24] = ~a ^ a;   // a == a, so out[24] is always 1.
> out[23] = ~a ^ b;
> out[22] = ~a ^ c;
> ...
> out[ 1] = ~e ^ d;
> out[ 0] = ~e ^ e;
> ```
> 

![image.png](/images/posts/ysyx-e1/image%2012.png)

```verilog
module top_module (
    input a, b, c, d, e,
    output [24:0] out );//

    wire [4:0]t;
    assign t = {a, b, c, d, e};
    assign out = ~{{5{a}}, {5{b}}, {5{c}}, {5{d}}, {5{e}}} ^ {5{t}};

endmodule
```

## **Modules: Hierarchy**

### **Module**

module用于在verilog中的描述一个独立的电路，其有自己的输入和输出。我们可以将多个小的module组合成更大的module。

两种使用子module的方法：

- 通过位置绑定输入：`mod_a instance1 ( wa, wb, wc );`
- 通过名字绑定输入：`mod_a instance2 ( .out(wc), .in1(wa), .in2(wb) );`

假设我们现在已经有了一个module：

```verilog
module mod_a ( input in1, input in2, output out );
    // Module body
endmodule
```

现在我们希望在top_module中使用它：

```verilog
module top_module ( input a, input b, output out );
    mod_a instance1(a, b, out);
endmodule
```

### **Module pos**

如下图所示，使用mod_a实现top_module：

```verilog
module mod_a ( output, output, input, input, input, input );
```

![image.png](/images/posts/ysyx-e1/image%2013.png)

根据mod_a的输入和输出端口的位置，在top_module中使用它。

```verilog
module top_module ( 
    input a, 
    input b, 
    input c,
    input d,
    output out1,
    output out2
);
    
    mod_a instance1(out1, out2, a, b, c, d);

endmodule
```

### **Module name**

这个练习用于让我们熟悉使用名字来连接子module的输入输出端。

```verilog
module top_module ( 
    input a, 
    input b, 
    input c,
    input d,
    output out1,
    output out2
);
    
    mod_a instance1(.in1(a), .in2(b), .in3(c), .in4(d), .out1(out1), .out2(out2));

endmodule
```

### **Module shift**

题目提供了module my_dff：

```verilog
module my_dff ( input clk, input d, output q );
```

实现如下图所示的电路：

![image.png](/images/posts/ysyx-e1/image%2014.png)

```verilog
module top_module ( input clk, input d, output q );
    wire t1, t2;
    
    my_dff instance1(clk, d, t1);
    my_dff instance2(clk, t1, t2);
    my_dff instance3(clk, t2, q);

endmodule
```

### **Module shift8**

题目提供了module my_dff8，构建类似上题的电路，并根据2-bits的sel信号选择输出：

```verilog
module my_dff8 ( input clk, input [7:0] d, output [7:0] q );
```

![image.png](/images/posts/ysyx-e1/image%2015.png)

```verilog
module top_module ( 
    input clk, 
    input [7:0] d, 
    input [1:0] sel, 
    output reg [7:0] q 
);
    
    wire [7:0] t1, t2, t3;
    my_dff8 instance1(clk, d, t1);
    my_dff8 instance2(clk, t1, t2);
    my_dff8 instance3(clk, t2, t3);
    
    always @(*) begin
        case (sel)
            2'b00: q = d;
            2'b01: q = t1;
            2'b10: q = t2;
            2'b11: q = t3;
        endcase
    end

endmodule
```

这里通过**alwasy case语句**使用了行为建模（描述电路行为，而不是描述电路组件的连线），在always中不能使用assign语句，而是直接使用`=`或`<=` ，它们的区别后面会讲到。

### **Module add**

使用module add16构造32位加法器：

```verilog
module add16 ( input[15:0] a, input[15:0] b, input cin, output[15:0] sum, output cout );
```

![image.png](/images/posts/ysyx-e1/image%2016.png)

```verilog
module top_module(
    input [31:0] a,
    input [31:0] b,
    output [31:0] sum
);	
    wire cout_1;
    add16 instance1(a[15:0], b[15:0], 0, sum[15:0], cout_1);
    add16 instance2(a[31:16], b[31:16], cout_1, sum[31:16]);
    
endmodule
```

### **Module fadd**

实现1-bit的full-adder：

```verilog
module top_module (
    input [31:0] a,
    input [31:0] b,
    output [31:0] sum
);
    wire cout_1;
    add16 instance1(a[15:0], b[15:0], 0, sum[15:0], cout_1);
    add16 instance2(a[31:16], b[31:16], cout_1, sum[31:16]);
endmodule

module add1 ( input a, input b, input cin,   output sum, output cout );

// Full adder module here
    assign sum = a ^ b ^ cin;
    assign cout = (a & b) | (a & cin) | (b & cin);

endmodule
```

### **Module cseladd**

通过add16串联构成add32性能有限，因为计算高位数据的加法器要运行需要等待计算低位数据的加法器输出的cout。这里我们尝试对串联加法器进行优化。

![image.png](/images/posts/ysyx-e1/image%2017.png)

```verilog
module top_module(
    input [31:0] a,
    input [31:0] b,
    output [31:0] sum
);
    wire [15:0] out0, out1, sel;
    add16 instance1(a[15:0], b[15:0], 0, sum[15:0], sel);
    add16 instance2(a[31:16], b[31:16], 0, out0);
    add16 instance3(a[31:16], b[31:16], 1, out1);
	
    mux21_16 instance4(out0, out1, sel, sum[31:16]);
    
endmodule

module mux21_16 (
    input [15:0] a,
    input [15:0] b,
    input sel,
    output [15:0]out
);
    always @(*) begin
        if (sel) 
            out = b;
        else
            out = a;
    end
    
endmodule
```

### **Module addsub**

使用加法器硬件构造减法器：

![image.png](/images/posts/ysyx-e1/image%2018.png)

```verilog
module top_module(
    input [31:0] a,
    input [31:0] b,
    input sub,
    output [31:0] sum
);
    wire cout_1; 
    wire [31:0] sub_in, b_flip;
    
    assign sub_in = {{31{sub}}, sub};  // 符号扩展sub
    assign b_flip = b ^ sub_in;       
    
    add16 instance1(a[15:0], b_flip[15:0], sub, sum[15:0], cout_1);
    add16 instance2(a[31:16], b_flip[31:16], cout_1, sum[31:16]);
	
endmodule
```

## Procedure

### **Alwaysblock1**

verilog通过always语句提供了行为建模的电路构造方法：

- Combinational：`always @(*)`
- Clocked：`always @(posedge clk)`

组合逻辑的always块的敏感列表始终使用`@(*)` 或 `@*` ，

```verilog
// 推荐：自动推导敏感信号
always @(*) begin
    y = a & b | c;
end

// 推荐：SystemVerilog
always_comb begin
    y = a & b | c;
end

// 不推荐：手动列出信号
always @(a or b or c) begin
    y = a & b | c;
end
```

wire和reg的区别：

- **wire**：表示**连线**，用于连接模块，值由驱动源决定
- **reg**：表示**变量**，用于过程赋值（always/initial 块）

```verilog
// assign 语句左侧 → 必须是 wire（net 类型）
wire [7:0] q;
assign q = a & b;     // 正确

// always 块内赋值 → 必须是 reg（variable 类型）
reg [7:0] q;
always @(*) begin
    q = a & b;        // 正确
end
```

```verilog
// synthesis verilog_input_version verilog_2001
module top_module(
    input a, 
    input b,
    output wire out_assign,
    output reg out_alwaysblock
);	
    
    assign out_assign = a & b;
    
    always @(*) begin
        out_alwaysblock = a & b;
    end
    

endmodule
```

### **Alwaysblock2**

对于存在时钟信号的电路，可以使用 **always @(posedge clk)**来定义。

三种赋值语句：

- **Continuous** assignments (`assign x = y;`)。被用于always语句之外
- Procedural **blocking** assignment: (`x = y;`)。被用于组合逻辑的always语句中
- Procedural **non-blocking** assignment: (`x <= y;`)。被用于时序逻辑的always语句中

![image.png](/images/posts/ysyx-e1/image%2019.png)

> Build an XOR gate three ways, using an assign statement, a combinational always block, and a clocked always block. Note that the clocked always block produces a different circuit from the other two: There is a flip-flop so the output is delayed.
> 

```verilog
// synthesis verilog_input_version verilog_2001
module top_module(
    input clk,
    input a,
    input b,
    output wire out_assign,
    output reg out_always_comb,
    output reg out_always_ff   );
	   
		assign out_assign = a ^ b;
    always @(*) out_always_comb = a ^ b;
    always @(posedge clk) out_always_ff <= a ^ b;
endmodule
```

### **Always if**

verilog的always语句中支持if语句：

```verilog
always @(*) begin
    if (condition) begin
        out = x;
    end
    else begin
        out = y;
    end
end
```

此外verilog还支持条件表达式：

```verilog
assign out = (condition) ? x : y;
```

> Build a **2-to-1 mux** that chooses between a and b.
> 

```verilog
// synthesis verilog_input_version verilog_2001
module top_module(
    input a,
    input b,
    input sel_b1,
    input sel_b2,
    output wire out_assign,
    output reg out_always   ); 
    
    // 布尔代数的写法
    assign out_assign = (sel_b1 & sel_b2 & b) | ((~sel_b1 | ~sel_b2) & a);
    
    // 行为建模的写法
    always @(*)
        if (sel_b1 && sel_b2) begin
            out_always = b;
        end
    	else begin
            out_always = a;
        end
endmodule
```

### **Always if2**

- **区分软件编程和硬件编程**
    - Verilog语句正确不代表设计出来的电路就一定正确，
    - 记住：保持输出不变！！！
    - 软件编程像写菜谱："如果饿了，就做饭"（不饿就不做，保持原状）。
    - 硬件设计像搭电路："无论饿不饿，电路都必须输出一个明确的信号"（不能悬空或保持上次状态）。
    - 典型的错误：
        - if没有对应的else
        - case缺少default
    - 如果不考虑if为假的情况
        - 在 `always @(*)` 组合逻辑块中，如果**某些条件下某个输出没有被赋值**，综合工具会认为"这种情况输出保持不变"。
        - **问题**：组合逻辑没有记忆功能，要"保持原值"就必须引入一个存储元件 → **锁存器（Latch）**。

> 
> 
> 
> What you *must not* do is write the code first, then hope it generates a proper circuit.
> 
> - If (cpu_overheated) then shut_off_computer = 1;
> - If (~arrived) then keep_driving = ~gas_tank_empty;

```verilog
// synthesis verilog_input_version verilog_2001
module top_module (
    input      cpu_overheated,
    output reg shut_off_computer,
    input      arrived,
    input      gas_tank_empty,
    output reg keep_driving
);
		
    // 组合逻辑1：CPU过热时关机
    always @(*) begin
        if (cpu_overheated)
            shut_off_computer = 1;
        else
            shut_off_computer = 0;  // 明确赋值
    end
		
    // 组合逻辑2：未到达且油箱不为空时继续驾驶
    always @(*) begin
        if (~arrived)
            keep_driving = ~gas_tank_empty;
        else
            keep_driving = 0;  // 明确赋值（到达后停止驾驶）
    end

endmodule
```

### **Always case**

verilog的always语句支持case（类似C语言中的switch）：

```verilog
always @(*) begin     // This is a combinational circuit
    case (in)
      1'b1: begin 
               out = 1'b1;  // begin-end if >1 statement
            end
      1'b0: out = 1'b0;
      default: out = 1'bx;
    endcase
end
```

> create a 6-to-1 multiplexer. When sel is between 0 and 5, choose the corresponding data input. Otherwise, output 0. The data inputs and outputs are all 4 bits wide.
> 

```verilog
// synthesis verilog_input_version verilog_2001
module top_module ( 
    input [2:0] sel, 
    input [3:0] data0,
    input [3:0] data1,
    input [3:0] data2,
    input [3:0] data3,
    input [3:0] data4,
    input [3:0] data5,
    output reg [3:0] out   );//
		
    always@(*) begin  // This is a combinational circuit
        case(sel)
            3'b000: out = data0;
            3'b001: out = data1;
            3'b010: out = data2;
            3'b011: out = data3;
            3'b100: out = data4;
            3'b101: out = data5;
            default: out = 0;
        endcase
    end
endmodule
```

### **Always case2**

> Build a 4-bit priority encoder.
> 

这里要实现优先级编码器，用于输出最低1的位置。使用case语句来实现的话，非常繁琐，这里使用**casez**语句，其支持通配符，可以大大简化实现。

![image.png](/images/posts/ysyx-e1/image%2020.png)

```verilog
// synthesis verilog_input_version verilog_2001
module top_module (
    input [3:0] in,
    output reg [1:0] pos  );
	
    always @(*)
        casez(in)
            4'b???1: pos = 2'd0;
            4'b??10: pos = 2'd1;
            4'b?100: pos = 2'd2;
            4'b1000: pos = 2'd3;
            default: pos = 2'd0;
        endcase
endmodule
```

### **Always casez**

> Build a priority encoder for 8-bit inputs.
> 

```verilog
// synthesis verilog_input_version verilog_2001
module top_module (
    input [7:0] in,
    output reg [2:0] pos );
	always @(*)
        casez(in)
            8'b???????1: pos = 3'd0;
            8'b??????10: pos = 3'd1;
            8'b?????100: pos = 3'd2;
            8'b????1000: pos = 3'd3;
            8'b???10000: pos = 3'd4;
            8'b??100000: pos = 3'd5;
            8'b?1000000: pos = 3'd6;
            8'b10000000: pos = 3'd7;
            default: pos = 3'd0;
        endcase
endmodule
```

### **Always nolatches**

> Build this circuit that recognizes these four scancodes and asserts the correct output.
> 

该电路的输入是2字节的键盘扫描码，输出是根据扫描码中对应的按键输出left、down、right和up。

```verilog
Scancode [15:0]	Arrow key
16'he06b	left arrow
16'he072	down arrow
16'he074	right arrow
16'he075	up arrow
Anything else	none
```

在组合逻辑中，当某些输出端口没有被明确赋值时，硬件需要**锁存器**来**保持（记住）**上次的值。

**为什么要避免锁存器？**

1. **时序不确定**：锁存器是电平敏感的，时序分析困难
2. **可能产生毛刺**：容易导致功能错误
3. **FPGA 资源浪费**：大多数 FPGA 没有专用的锁存器单元，会消耗更多资源
4. **设计意图模糊**：通常是无意中产生的，不是设计者的本意

一种实现思路是在所有分支中进行赋值，但每个分支都要写 4 个赋值，代码冗余。

```verilog
always @(*) begin
    case (scancode)
        8'h45: begin up = 1; down = 0; left = 0; right = 0; end
        8'h1D: begin up = 0; down = 1; left = 0; right = 0; end
        8'h1C: begin up = 0; down = 0; left = 1; right = 0; end
        8'h23: begin up = 0; down = 0; left = 0; right = 1; end
        default: begin up = 0; down = 0; left = 0; right = 0; end
    endcase
end
```

这里可以用"默认赋值"的技巧来避免锁存器：

```verilog
// synthesis verilog_input_version verilog_2001
module top_module (
    input [15:0] scancode,
    output reg left,
    output reg down,
    output reg right,
    output reg up  ); 
    
    always @(*) begin
	    up = 1'b0; down = 1'b0; left = 1'b0; right = 1'b0;
	    case (scancode)
	        16'he06b: left = 1;
	        16'he072: down = 1;
	        16'he074: right = 1;
	        16'he075: up = 1;
	        default: ;
	    endcase
	    end
endmodule
```

## More verilog features

### **Conditional**

Verilog支持条件表达式，用法C语言的条件语句差不多：**(condition ? if_true : if_false)**

```verilog
module top_module (
    input [7:0] a, b, c, d,
    output [7:0] min);//

    // assign intermediate_result1 = compare? true: false;
    wire [7:0] t1, t2;
    assign t1 = (a < b) ? a : b;
    assign t2 = (c < d) ? c : d;
    assign min = (t1 < t2) ? t1 : t2;
endmodule
```

### **Reduction**

verilog支持**reduction operators**：

```verilog
& a[3:0]     // AND: a[3]&a[2]&a[1]&a[0]. Equivalent to (a[3:0] == 4'hf)
| b[3:0]     // OR:  b[3]|b[2]|b[1]|b[0]. Equivalent to (b[3:0] != 4'h0)
^ c[2:0]     // XOR: c[2]^c[1]^c[0]
```

> **Parity checking** is often used as a simple method of detecting errors when transmitting data through an imperfect channel. Create a circuit that will **compute a parity bit for a 8-bit byte** (which will add a 9th bit to the byte). We will use "even" parity, where the parity bit is just the XOR of all 8 data bits.
> 

```verilog
module top_module (
    input [7:0] in,
    output parity); 
    assign parity = ^ in[7:0];
endmodule
```

### **Gates100**

同上，使用**reduction operators**即可**。**

```verilog
module top_module( 
    input [99:0] in,
    output out_and,
    output out_or,
    output out_xor 
);
    assign out_and = & in[99:0];
    assign out_or = | in[99:0];
    assign out_xor = ^ in[99:0];

endmodule
```

### **Vector100r**

verilog还在always中支持**for-loop**。

> Given a 100-bit input vector [99:0], reverse its bit ordering.
> 

```verilog
module top_module( 
    input [99:0] in,
    output [99:0] out
);
    integer i;
    always @(*)
        for (i = 0; i < 100; i = i + 1) begin
            out[i] = in[99-i];
        end
endmodule
```

### **Popcount255**

> A "**population count**" circuit **counts the number of '1's in an input vector**. Build a population count circuit for a 255-bit input vector.
> 

记录输入的255个bits中有多少个1，使用for循环 + 一个变量sum实现：

```verilog
module top_module( 
    input [254:0] in,
    output [7:0] out );
	
    integer i, sum;
    always @(*) begin
        sum = 0;
        for(i = 0; i < 255; i = i + 1)
            sum = sum + in[i];
        out = sum;
    end
endmodule
```

### **Adder100i**

> Create a **100-bit binary ripple-carry adder** by instantiating 100 [full adders](https://hdlbits.01xz.net/wiki/Fadd). (You also need to write the full adder module, possibly by reusing your solution to [fadd](https://hdlbits.01xz.net/wiki/fadd).)
> 

使用一位的全加器和循环来实现一个100位的全加器：

- 自定义一位全加器fadd模块
- 使用generate循环实例化100个全加器，注意变量要用**genvar**定义

```verilog
module top_module( 
    input [399:0] a, b,
    input cin,
    output cout,
    output [399:0] sum
);
    
    wire [99:0] carry;  // 100个进位信号
    assign carry[0] = cin;
    
    genvar i;
    generate
        for (i = 0; i < 100; i = i + 1) begin : bcd_adder
            if (i == 0) begin
                bcd_fadd u_bcd_fadd (
                    .a(a[3:0]),
                    .b(b[3:0]),
                    .cin(carry[0]),
                    .sum(sum[3:0]),
                    .cout(carry[1])
                );
            end
            else if (i == 99) begin
                bcd_fadd u_bcd_fadd (
                    .a(a[4*i +: 4]),   // 从 4*i 开始，取 4 位
                    .b(b[4*i +: 4]),
                    .cin(carry[i]),
                    .sum(sum[4*i +: 4]),
                    .cout(cout)         // 最后一位的进位输出到 cout
                );
            end
            else begin
                bcd_fadd u_bcd_fadd (
                    .a(a[4*i +: 4]),
                    .b(b[4*i +: 4]),
                    .cin(carry[i]),
                    .sum(sum[4*i +: 4]),
                    .cout(carry[i+1])
                );
            end
        end
    endgenerate

endmodule
```

### **Bcdadd100**

使用1个10进制位的BCD加法器构造一个100个10进制数的BCD加法器

- 使用 **+:** 和 **-:** 来构建索引向量部分的选择
    - **+:** 从 base 开始，向上取 width 位
    - **-:**  从 base 开始，向下取 width 位

```verilog
module top_module( 
    input [399:0] a, b,
    input cin,
    output cout,
    output [399:0] sum
);
    
    wire [100:0] carry;  // 101位进位信号，carry[0]=cin, carry[100]=cout
    assign carry[0] = cin;
    assign cout = carry[100];
    
    genvar i;
    generate
        for (i = 0; i < 100; i = i + 1) begin : bcd_adder
            bcd_fadd u_bcd_fadd (
                .a(a[4*i +: 4]),      // 从 4*i 开始取 4 位
                .b(b[4*i +: 4]),
                .cin(carry[i]),
                .sum(sum[4*i +: 4]),
                .cout(carry[i+1])
            );
        end
    endgenerate

endmodule
```

# Circuits

## Combinational Logic

<aside>
💡

这部分中有很多内容与前面重复了，故仅记录不重复的部分。

</aside>

### Basic Gates

### **Thermostat**

```verilog
module top_module (
    input too_cold,
    input too_hot,
    input mode,
    input fan_on,
    output heater,
    output aircon,
    output fan
); 
    wire heater_tmp, aircon_tmp;
    assign heater_tmp = mode & too_cold;
    assign aircon_tmp = ~mode & too_hot;
    
    assign heater = heater_tmp & (~aircon_tmp);
    assign aircon = aircon_tmp & (~heater_tmp);
    assign fan = fan_on | heater | aircon;

endmodule
```

### **Gatesv100**

```verilog
module top_module( 
    input [99:0] in,
    output [98:0] out_both,
    output [99:1] out_any,
    output [99:0] out_different );

    integer i;
    always@(*)
        for (i = 0; i < 99; i = i + 1) 
            out_both[i] = in[i] & in[i+1];
    
     always@(*)
         for (i = 99; i > 0; i = i - 1) 
             out_any[i] = in[i] | in[i-1];
    
    always@(*)
        for (i = 0; i < 99; i = i + 1) 
            out_different[i] = in[i] ^ in[i+1];
    
    assign out_different[99] = in[99] ^ in[0];

endmodule
```

## Mutiplexer

### **Mux-2-1**

> Create a one-bit wide, 2-to-1 multiplexer. When sel=0, choose a. When sel=1, choose b.
> 

```verilog
module top_module( 
    input a, b, sel,
    output out ); 
    assign out = (a & ~sel) | (b & sel);
endmodule
```

### **Mux-2-1-Bus**

> Create a 100-bit wide, 2-to-1 multiplexer. When sel=0, choose a. When sel=1, choose b.
> 

```verilog
module top_module( 
    input [99:0] a, b,
    input sel,
    output [99:0] out );
    assign out = (sel ? b : a);
endmodule
```

### **Mux-9-1**

> Create a 16-bit wide, 9-to-1 multiplexer. sel=0 chooses a, sel=1 chooses b, etc. For the unused cases (sel=9 to 15), set all output bits to '1'.
> 

```verilog
module top_module( 
    input [15:0] a, b, c, d, e, f, g, h, i,
    input [3:0] sel,
    output [15:0] out );
    
    always @(*) begin
        case (sel)
            4'b0000: out = a;
            4'b0001: out = b;
            4'b0010: out = c;
            4'b0011: out = d;
            4'b0100: out = e;
            4'b0101: out = f;
            4'b0110: out = g;
            4'b0111: out = h;
            4'b1000: out = i;
            default: out = 16'hFFFF;
        endcase
    end
endmodule
```

### **Mux-256-1**

> Create a **1-bit wide**, **256-to-1 multiplexer**. The 256 inputs are all packed into a single 256-bit input vector. sel=0 should select in[0], sel=1 selects bits in[1], sel=2 selects bits in[2], etc.
> 

```verilog
module top_module( 
    input [255:0] in,
    input [7:0] sel,
    output out );
    assign out = in[sel];
endmodule
```

### **Mux-256-1-4**

> Create a **4-bit wide**, **256-to-1 multiplexer**. The 256 4-bit inputs are all packed into a single 1024-bit input vector. sel=0 should select bits in[3:0], sel=1 selects bits in[7:4], sel=2 selects bits in[11:8], etc.
> 
- 每4个bits为一组
- 所以需要使用sel*4来找到目标bits
- 然后使用 **+: 4** 来取4个bits

```verilog
module top_module (
    input [1023:0] in,
    input [7:0] sel,
    output [3:0] out
);
    assign out = in[sel*4 +: 4];
endmodule
```

### Hadd

> Create a half adder. A half adder adds two bits (with no carry-in) and produces a sum and carry-out.
> 

```verilog
module top_module( 
    input a, b,
    output cout, sum );
	
    assign sum = a  ^ b;
    assign cout = a & b;
    
endmodule
```

### **Fadd**

> Create a full adder. A full adder adds three bits (including carry-in) and produces a sum and carry-out.
> 

```verilog
module top_module( 
    input a, b, cin,
    output cout, sum );
    
    assign sum = a ^ b ^ cin;
    assign cout = (a & b) | (a & cin) | (b & cin);

endmodule
```

### **Adder3**

> Make 3 instances of it to create a 3-bit binary ripple-carry adder
> 

```verilog
module fadd( 
    input a, b, cin,
    output cout, sum );
    
    assign sum = a ^ b ^ cin;
    assign cout = (a & b) | (a & cin) | (b & cin);

endmodule

module top_module( 
    input [2:0] a, b,
    input cin,
    output [2:0] cout,
    output [2:0] sum );
    
    fadd instance1(a[0], b[0], cin, cout[0], sum[0]);
    fadd instance2(a[1], b[1], cout[0], cout[1], sum[1]);
    fadd instance3(a[2], b[2], cout[1], cout[2], sum[2]);

endmodule
```

### Signed addition overflow

构造一个补码的加法器，还提供判断溢出的功能。

- 先构造一个1bit全加器
- 然后利用该全加器构造8位的加法器，并输出最高进位和次高进位
- 补码的overflow判断通过这两个进位求异或得到

```verilog
module fadd( 
    input a, b, cin,
    output cout, sum );
    
    assign cout = (a & b) | (cin & (a | b));
	assign sum = a ^ b ^ cin;
endmodule

module adder8 (
    input [7:0] x,
    input [7:0] y, 
    output [7:0] sum,
	output cout1,
	output cout2);
		
    wire [7:0] t_cout;
    fadd adder1(x[0], y[0], 0, t_cout[0], sum[0]);
    fadd adder2(x[1], y[1], t_cout[0], t_cout[1], sum[1]);
    fadd adder3(x[2], y[2], t_cout[1], t_cout[2], sum[2]);
    fadd adder4(x[3], y[3], t_cout[2], t_cout[3], sum[3]);
    fadd adder5(x[4], y[4], t_cout[3], t_cout[4], sum[4]);
    fadd adder6(x[5], y[5], t_cout[4], t_cout[5], sum[5]);
    fadd adder7(x[6], y[6], t_cout[5], cout1, sum[6]);
    fadd adder8(x[7], y[7], cout1, cout2, sum[7]);
endmodule

module top_module (
    input [7:0] a,
    input [7:0] b,
    output [7:0] s,
    output overflow
); //
    wire cout1, cout2;
    adder8 adder(a, b, s, cout1, cout2);
    assign overflow = cout1 ^ cout2;

endmodule
```

### **Adder100**

> Create a 100-bit binary adder. The adder adds two 100-bit numbers and a carry-in to produce a 100-bit sum and carry out.
> 

```verilog
module top_module( 
    input [99:0] a, b,
    input cin,
    output cout,
    output [99:0] sum );
    
	assign {cout, sum} = a + b + cin;
    
endmodule
```

**为什么这样写是完美的？**

1. **自动位宽扩展**：`a` 和 `b` 是 100 位，`cin` 是 1 位。当它们相加时，Verilog 会自动将 `cin` 扩展到 100 位进行计算。
2. **拼接赋值**：`{cout, sum}` 是一个 **101位** 的拼接向量（1位进位 + 100位结果），刚好能装下这 100 位数相加可能产生的最大结果（100位全1相加再加1，最多产生101位的结果），不会发生数据截断。
3. **硬件优化**：Vivado 等综合工具会将这行代码直接映射到 FPGA 内部的**专用快速进位链（Carry Chain）**，不仅代码极简，而且生成的电路非常快，比你自己写 100 个全加器实例化要高效得多。

## Sequential Logic

### **Dff（D flip-flops）**

> A D flip-flop is a circuit that stores a bit and is updated periodically, at the (usually) positive edge of a clock signal.
> 

DFF会在每个时钟的上升沿采样输入d，修改输出q。

```verilog
module top_module (
    input clk,    // Clocks are used in sequential circuits
    input d,
    output reg q );

    always @(posedge clk) begin
        q <= d;
    end
    
endmodule
```

### **Dff8**

> Create 8 D flip-flops. All DFFs should be triggered by the positive edge of clk.
> 

Verilog会自动处理Vector，因此DFF8的写法和1-bit DFF相同。

```verilog
module top_module (
    input clk,
    input [7:0] d,
    output [7:0] q
);
	always @(posedge clk) begin
        q <= d;
    end
endmodule
```

### **Dff8r（8 D flip-flops with reset）**

> Create 8 D flip-flops with active high synchronous reset. All DFFs should be triggered by the positive edge of clk.
> 

在电路中加入对Reset信号的处理，同步Reset仅在时钟的上升沿触发。

```verilog
module top_module (
    input clk,
    input reset,            // Synchronous reset
    input [7:0] d,
    output [7:0] q
);
    
    always @(posedge clk) begin
        if (reset)
            q <= 0;
        else 
            q <= d;
    end

endmodule
```

### **Dff8p**

> Create 8 D flip-flops with active high synchronous reset. The flip-flops must be reset to 0x34 rather than zero. All DFFs should be triggered by the **negative** edge of clk.
> 

这里需要采用下降沿触发，Reset信号有效时q置为0x34。

```verilog
module top_module (
    input clk,
    input reset,
    input [7:0] d,
    output [7:0] q
);
    
    always @(negedge clk) begin
        if (reset) 
            q <= 8'h34;
        else 
			q <= d;
    end
endmodule

```

### **Dff16e**

> Create 16 D flip-flops. It's sometimes useful to only modify parts of a group of flip-flops.
> 

将16-bit的q和d划分为两半部分，使用一个2-bit输入byteena来分别控制更新它们的更新。此外，reset采用低电平触发。

```verilog
module top_module (
    input clk,
    input resetn,
    input [1:0] byteena,
    input [15:0] d,
    output [15:0] q
);
    
    always @(posedge clk) begin
        if (!resetn) 
            q <= 0;
        else begin
            if (byteena[0]) 
                q[7:0] <= d[7:0];
        	else 
                q[7:0] <= q[7:0];
            
            if (byteena[1]) 
                q[15:8] <= d[15:8];
        	else 
                q[15:8] <= q[15:8];
        end
    end

endmodule

```

### **Dff8ar**

> Create 8 D flip-flops with active high asynchronous reset. All DFFs should be triggered by the positive edge of clk.
> 

要求实现异步的reset，当areset信号遇到上升沿，即使时钟上升沿还未到来，也需要立即复位。

```verilog
module top_module (
    input clk,
    input areset,   // active high asynchronous reset
    input [7:0] d,
    output [7:0] q
);
    always @(posedge clk or posedge areset) begin
        if (areset) 
            q <= 0;
        else 
            q <= d;
    end

endmodule
```

![image.png](/images/posts/ysyx-e1/image%2021.png)

### **Dff16e**

> Create 16 D flip-flops. It's sometimes useful to only modify parts of a group of flip-flops.
> 

```verilog
module top_module (
    input clk,
    input resetn,
    input [1:0] byteena,
    input [15:0] d,
    output reg [15:0] q   // 加上 reg
);
    always @(posedge clk) begin
        if (~resetn)
            q <= 16'd0;
        else begin
            if (byteena[0])
                q[7:0] <= d[7:0];  // 使能则更新
            // 如果不使能，这里不写，因为 q 是 reg，在时钟沿会保持原值
            if (byteena[1])
                q[15:8] <= d[15:8];
        end
    end
endmodule
```

### **DLatch**

> Implement the Latch circuit.
> 

注意锁存器和触发器不同，触发器是边沿触发，而锁存器是水平触发，只要ena信号为1，就使用输入d更新输出q的值。

```verilog
module top_module (
    input d, 
    input ena,
    output q);
    
    always @(*) begin
        if (ena) 
            q = d;
        else
            q = q;
    end

endmodule
```

### **DFF**

```verilog
module top_module (
    input clk,
    input d, 
    input ar,   // asynchronous reset
    output q);
    
    always@(posedge clk or posedge ar) begin
        if (ar)
            q <= 0;
        else
            q <= d;
    end
endmodule
```

### **DFF+gate**

![image.png](/images/posts/ysyx-e1/image%2022.png)

```verilog
module top_module (
    input clk,
    input in, 
    output out);
    
    wire t;
		assign t = in ^ out;
    always @(posedge clk) begin
        out <= t;
    end

endmodule
```

### **muxdff**

![image.png](/images/posts/ysyx-e1/image%2023.png)

在下一次时钟上升沿到来之前，触发器的输出不能改变，因此需要使用reg来存储三个触发器的输出。

```verilog
module top_module (
    input clk,
    input x,
    output z
); 

    wire t1, t2, t3;
    reg q1, q2, q3;

    assign t1 = x ^ q1;
    assign t2 = x & ~q2;
    assign t3 = x | ~q3;
    
    always @(posedge clk) begin
        q1 <= t1;
        q2 <= t2;
        q3 <= t3;
    end
    
    assign z = ~(q1 | q2 | q3);

endmodule
```

**JK flip-flop**

> 实现下图所示的JK flip-flop。
> 

![image.png](/images/posts/ysyx-e1/image%2024.png)

- J = 0， K = 0时，保持原输出不变
- J = 0， K = 1时，输出置为0
- J = 1， K = 0时，输出置为1
- J = 1， K = 1时，输出取反

```verilog
module top_module (
    input clk,
    input j,
    input k,
    output reg Q
);
    always @(posedge clk) begin
        if ({j, k} == 2'b00)
            Q <= Q;
        else if ({j, k} == 2'b01)
            Q <= 1'b0;
        else if ({j, k} == 2'b10)
            Q <= 1'b1;
        else
            Q <= ~Q;
    end
endmodule
```

### **Edgedetect**

这道题目要求检测输入信号**in**中的的上升沿，即上次记录的输入为0，当前输入为1时，将pedge对应bit设置为1。使用**reg [7:0] last** 记录上次的输入。

思路：使用reg记录上一次的状态，先前为0，当前为1，可以表示为 **in & ~last**。每个时钟周期更新last和pedge。

```verilog
module top_module (
    input clk,
    input [7:0] in,
    output reg [7:0] pedge
);

		reg [7:0] last;
		
		always @(posedge clk) begin
		    last <= in;
		    pedge <= in & ~last;
		end
		
endmodule
```

### **Edgedetect2**

这道题要求检测输入信号in的任意的边沿，即上升沿和下降沿都算，所以直接使用**异或**即可。

```verilog
module top_module (
    input clk,
    input [7:0] in,
    output [7:0] anyedge
);
    reg [7:0] last;
    always@(posedge clk) begin
        last <= in;
        anyedge <= in ^ last;
    end

endmodule
```

### **Edgecapture**

检测下降沿，将out对应bit设置为1。但这题要求如果没有检测到下降沿out中的bits要维持原状，直至同步reset信号到来，才统一置为0。

```verilog
module top_module (
    input clk,
    input reset,
    input [31:0] in,
    output reg [31:0] out
);

    reg [31:0] last;

    always @(posedge clk) begin
        if (reset)
            out <= 32'b0;
        else 
            out <= out | (~in & last);
        
        last <= in;
    end
endmodule
```

### **Dualedge**

这题希望同时在上升沿和下降沿触发，但是FPGA不支持类似**always @(posedge clk or negedge clk)**的写法。所以只能使用**两个触发器**，分别记录时钟上升沿时的输入和时钟下降沿时的输入。然后根据当前时钟的信号：

- 1，表示刚刚经过上升沿，将输出设置为上升沿时的输入
- 0，表示刚刚经过下降沿，将输出设置为下降沿时的输入

```verilog
module top_module (
    input clk,
    input d,
    output q
);
    reg up, down;
    always@(posedge clk) 
        up <= d;
	   
    always@(negedge clk) 
        down <= d;
		
    assign q = clk ? up : down;
endmodule
```

### **Count15**

> Build a 4-bit binary counter that counts from 0 through 15, inclusive, with a period of 16. The reset input is synchronous, and should reset the counter to 0.
> 

```verilog
module top_module (
    input clk,
    input reset,      // Synchronous active-high reset
    output [3:0] q);
    
    always@(posedge clk) begin
        if (reset)
           	q <= 4'd0;
        else
            q <= q + 1;
    end
    
endmodule
```

### **Count10**

> Build a decade counter that counts from 0 through 9, inclusive, with a period of 10.
> 

同上，但是仅记录到9，然后转为0。

```verilog
module top_module (
    input clk,
    input reset,        // Synchronous active-high reset
    output [3:0] q);
  
	always@(posedge clk) begin
        if (reset)
           	q <= 4'd0;
        else
            case(q)
                4'd9: q <= 0;
	            	default: q <= q + 1;
            endcase
    end
endmodule
```

### **Count1to10**

计数的范围为[1, 10]，reset信号重置输出为1。

```verilog
module top_module (
    input clk,
    input reset,        // Synchronous active-high reset
    output [3:0] q);
    
	always@(posedge clk) begin
        if (reset)
           	q <= 4'd1;
        else
            case(q)
                4'd10: q <= 1;
            	default: q <= q + 1;
            endcase
    end
endmodule
```

### **Countslow**

同前，但是只有在slowena为高电平时才增加计数。

```verilog
module top_module (
    input clk,
    input slowena,
    input reset,
    output [3:0] q);
    
    always @(posedge clk) begin
        if (reset)
            q <= 0;
        else if (slowena)  begin
            if (q == 4'd9)
                q <= 4'd0;
            else 
                q <= q + 1;
        end
    end

endmodule
```

### Counter 1-12

题目提供了count4电路：

```verilog
module count4(
	input clk,
	input enable,
	input load,
	input [3:0] d,
	output reg [3:0] Q
);
```

我们要利用count4来构造一个计数范围为[1, 12]的计数器，**enable**信号用于使能count4的计数不断+1，**load**信号用于控制将新的输入值更新到计数器。

```verilog
module top_module (
    input clk,
    input reset,
    input enable,
    output [3:0] Q,
    output c_enable,
    output c_load,
    output [3:0] c_d
);
    // c_enable：直接连接外部 enable
    assign c_enable = enable;
    
    // c_d：加载值为 1
    assign c_d = 4'd1;
    
    // c_load：复位 或 (Q==12 且 enable)
    // 注意：只有当 enable=1 时，Q=12 才需要加载回 1
    // 如果 enable=0，即使 Q=12 也应该保持 12
    assign c_load = reset | (Q == 4'd12 & enable);
    
    // 实例化 4-bit 计数器
    count4 counter (
        .clk(clk),
        .enable(c_enable),
        .load(c_load),
        .d(c_d),
        .Q(Q)
    );
    
endmodule
```

### Counter1000

该Counter使用三个BCD计数器记录三位十进制数，使能信号c_enable有3位，分别控制三个BCD计数器的运行：

```verilog
1000 Hz → BCD0 (个位) → BCD1 (十位) → BCD2 (百位) → OneHertz
         每秒计数100次   每秒计数10次    每秒计数1次
```

```verilog
module top_module (
    input clk,
    input reset,
    output OneHertz,
    output [2:0] c_enable
);
    wire [3:0] Q0, Q1, Q2;  // 个位、十位、百位 BCD 计数器
    
    // 使能信号链
    assign c_enable[0] = 1'b1;                    // 个位始终计数
    assign c_enable[1] = (Q0 == 4'd9);            // 个位到9时，十位使能
    assign c_enable[2] = (Q0 == 4'd9) && (Q1 == 4'd9); // 个位和十位都到9时，百位使能
    
    // OneHertz：当所有计数器都到9时输出（每秒一个脉冲）
    assign OneHertz = (Q0 == 4'd9) && (Q1 == 4'd9) && (Q2 == 4'd9);
    
    // 三个 BCD 计数器
    bcdcount counter0 (
        .clk(clk),
        .reset(reset),
        .enable(c_enable[0]),
        .Q(Q0)
    );
    
    bcdcount counter1 (
        .clk(clk),
        .reset(reset),
        .enable(c_enable[1]),
        .Q(Q1)
    );
    
    bcdcount counter2 (
        .clk(clk),
        .reset(reset),
        .enable(c_enable[2]),
        .Q(Q2)
    );
    
endmodule
```

### 12-hour-clock（难）

> Create a set of counters suitable for use as a 12-hour clock (with am/pm indicator). Your counters are clocked by a fast-running clk, with a pulse on ena whenever your clock should increment (i.e., once per second).
> 

```verilog
module top_module(
    input clk,
    input reset,
    input ena,
    output pm,
    output [7:0] hh,
    output [7:0] mm,
    output [7:0] ss
);

    reg pm_r;
    reg [7:0] hh_r, mm_r, ss_r;

    assign pm = pm_r;
    assign hh = hh_r;
    assign mm = mm_r;
    assign ss = ss_r;

    always @(posedge clk) begin
        if (reset) begin
            pm_r <= 1'b0;
            hh_r <= 8'h12;
            mm_r <= 8'h00;
            ss_r <= 8'h00;
        end
        else if (ena) begin
            // seconds
            if (ss_r == 8'h59) begin
                ss_r <= 8'h00;
                // minutes
                if (mm_r == 8'h59) begin
                    mm_r <= 8'h00;

                    // hours
                    if (hh_r == 8'h12) begin
                        hh_r <= 8'h01;
                        pm_r <= ~pm_r;
                    end
                    else if (hh_r == 8'h09) begin
                        hh_r <= 8'h10;
                    end
                    else begin
                        hh_r <= hh_r + 8'h01;
                    end
                end
                else if (mm_r[3:0] == 4'h9) begin
                    mm_r <= mm_r + 8'h07;
                end
                else begin
                    mm_r <= mm_r + 8'h01;
                end
            end

            // seconds
            else if (ss_r[3:0] == 4'h9) begin
                ss_r <= ss_r + 8'h07;
            end
            else begin
                ss_r <= ss_r + 8'h01;
            end
        end
    end

endmodule
```

### **Shift4**

> 
> 
> 
> Build a 4-bit shift register (right shift), with asynchronous reset, synchronous load, and enable.
> 
> - areset: Resets shift register to zero.
> - load: Loads shift register with data[3:0] instead of shifting.
> - ena: Shift right (q[3] becomes zero,  q[0] is shifted out and disappears).
> - q: The contents of the shift register.
> 
> If both the load and ena inputs are asserted (1), the load input has higher priority.
> 

注意load信号的优先级比ena信号的优先级要高，因此需要先判断load信号。

```verilog
module top_module(
    input clk,
    input areset,  // async active-high reset to zero
    input load,
    input ena,
    input [3:0] data,
    output reg [3:0] q); 
    
    always @(posedge clk or posedge areset) begin
        if (areset) 
            q <= 0;
        else if (load)
            q <= data;
        else if (ena)
            q <= {1'b0, q[3:1]};
    end

endmodule
```

### **Rotate100**

> 
> 
> 
> **Build a 100-bit left/right rotator, with synchronous load and left/right enable.** 
> 
> - load: Loads shift register with  instead of rotating.
>     
>     data[99:0]
>     
> - ena[1:0]: Chooses whether and which direction to rotate.
>     - 2'b01 rotates right by one bit
>     - 2'b10 rotates left by one bit
>     - 2'b00 and  do not rotate.
>         
>         2'b11
>         
> - q: The contents of the rotator.

这里要求实现一个旋转器，通过ena信号控制旋转的方式。

```verilog
module top_module(
    input clk,
    input load,
    input [1:0] ena,
    input [99:0] data,
    output reg [99:0] q); 
    
    always @(posedge clk) begin
        if (load) 
            q <= data;
        else begin
            case (ena)
                2'b01: q <= {q[0], q[99:1]};
                2'b10: q <= {q[98:0], q[99]};
                default: q <= q;
            endcase
        end
    end
		
endmodule
```

### **Shift18**

> 
> 
> 
> Build a 64-bit *arithmetic* shift register, with synchronous load. The shifter can shift both left and right, and by 1 or 8 bit positions, selected by amount.
> 
> There is no difference between logical and arithmetic *left* shifts.
> 
> - load: Loads shift register with  instead of shifting.
>     
>     data[63:0]
>     
> - ena: Chooses whether to shift.
> - amount: Chooses which direction and how much to shift.
>     - 2'b00: shift left by 1 bit.
>     - 2'b01: shift left by 8 bits.
>     - 2'b10: shift right by 1 bit.
>     - 2'b11: shift right by 8 bits.
> - q: The contents of the shifter.

实现一个64位的算数运算移位器，注意在右移时需要在高位处填入原数据的符号位。思路和前面实现的移位器差不多。

```verilog
module top_module(
    input clk,
    input load,
    input ena,
    input [1:0] amount,
    input [63:0] data,
    output reg [63:0] q); 
		
    always @(posedge clk) begin
        if (load) 
            q <= data;
        else if (ena) begin
            case (amount)
                2'b00: q <= {q[62:0], 1'b0};
                2'b01: q <= {q[55:0], 8'b0};
                2'b10: q <= {q[63], q[63:1]};
                2'b11: q <= {{8{q[63]}}, q[63:8]};
            endcase
        end
    end
    
endmodule
```

### **Lfsr5**

实现下图所示的电路：

![image.png](/images/posts/ysyx-e1/image%2025.png)

注意输出信号q必须为reg才能通过测试。

```verilog
module top_module(
    input clk,
    input reset,
    output reg [4:0] q
);

    wire t1, t2;

    assign t1 = q[0];
    assign t2 = q[3] ^ q[0];

    always @(posedge clk) begin
        if (reset) begin
            q <= 5'h1;
        end
        else begin
            q[4] <= t1;
            q[3] <= q[4];
            q[2] <= t2;
            q[1] <= q[2];
            q[0] <= q[1];
        end
    end

endmodule
```

### **3-bits lfsr**

按下图实现电路：

![image.png](/images/posts/ysyx-e1/image%2026.png)

```verilog
module top_module (
	input [2:0] SW,      // R
	input [1:0] KEY,     // L and clk
	output reg [2:0] LEDR);  // Q
    
    wire t1, t2, t3, t4;
    assign t1 = KEY[1] ? SW[0] : LEDR[2];
    assign t2 = KEY[1] ? SW[1] : LEDR[0];
    assign t3 = LEDR[1] ^ LEDR[2];
    assign t4 = KEY[1] ? SW[2] : t3;

    always @(posedge KEY[0]) begin
        LEDR[0] <= t1;
        LEDR[1] <= t2;
        LEDR[2] <= t4;
    end

endmodule
```

### Shift register

![image.png](/images/posts/ysyx-e1/image%2027.png)

```verilog
module top_module (
    input clk,
    input resetn,   // synchronous reset
    input in,
    output out);
    
    reg q1, q2, q3;
    
    always @(posedge clk) begin 
        if (~resetn) begin
            q1 <= 0;
            q2 <= 0;
            q3 <= 0;
            out <= 0;
        end else begin
            q1 <= in;
            q2 <= q1;
            q3 <= q2;
            out <= q3;
        end
    end

endmodule
```

### 3-input LUT

```verilog
module top_module (
    input clk,
    input enable,
    input S,
    input A, B, C,
    output Z
);
    reg [7:0] Q;
    wire [2:0] addr = {A, B, C};
    
    // 8-bit 移位寄存器
    always @(posedge clk) begin
        if (enable) begin
            Q <= {Q[6:0], S};  // 左移，S 进入最低位
        end
    end
    
    // 8:1 多路复用器
    assign Z = Q[addr];
    
endmodule
```

## More Circuits

### **Rule90**

每个时钟周期的上升沿都执行 `q[i] = q[i-1] ^ q[i+1]`，但当load为1，q直接设置为data。

```verilog
module top_module(
    input clk,
    input load,
    input [511:0] data,
    output [511:0] q ); 
	
    integer i;
    always @(posedge clk) begin
        if (load) 
            q <= data;
        else begin
            q[0] <= q[1];
            q[511] <= q[510];
            for (i = 1; i < 511; i++) begin
                q[i] <= q[i-1] ^ q[i+1];
            end
        end
    end
    
endmodule
```

### **Rule110**

**Rule 110** 是一个**一维元胞自动机**，它的规则编号来自"下一状态"列的二进制值。

```verilog
module top_module(
    input clk,
    input load,
    input [511:0] data,
    output reg [511:0] q
);

    reg [511:0] q_next;
    integer i;

    // 按真值表定义函数rule110
    function rule110;
        input left;
        input center;
        input right;

        begin
            case ({left, center, right})
                3'b111: rule110 = 1'b0;
                3'b110: rule110 = 1'b1;
                3'b101: rule110 = 1'b1;
                3'b100: rule110 = 1'b0;
                3'b011: rule110 = 1'b1;
                3'b010: rule110 = 1'b1;
                3'b001: rule110 = 1'b1;
                3'b000: rule110 = 1'b0;
            endcase
        end
    endfunction

    always @(*) begin
        // q[0]: right boundary is q[1], left boundary is 0
        q_next[0] = rule110(q[1], q[0], 1'b0);

        // q[1] ~ q[510]
        for (i = 1; i < 511; i = i + 1) begin
            q_next[i] = rule110(q[i+1], q[i], q[i-1]);
        end

        // q[511]: left boundary is q[510], right boundary is 0
        q_next[511] = rule110(1'b0, q[511], q[510]);

    end

    always @(posedge clk) begin
        if (load)
            q <= data;
        else
            q <= q_next;
    end

endmodule
```

### **Conwaylife**

**康威生命游戏（Conway's Game of Life）**是一个在 **16×16 环形网格** 上实现的二维元胞自动机。

核心规则是每个细胞根据其**8 个邻居**（上、下、左、右、四个对角）的存活数量决定下一状态：

- 0-1 存活的邻居: Cell 置为 0。
- 2 存活的邻居: Cell 不变。
- 3 存活的邻居: Cell 置为 1。
- 4+ 存活的邻居: Cell 置为 0。

解释：

- 邻居太少（<2）→ 孤独死
- 邻居正好 2 个 → 保持原样
- 邻居正好 3 个 → 新生（或保持存活）
- 邻居太多（>3）→ 拥挤死

这个问题的难点不在于康威生命游戏的规则，而在于如何将长度为256的一维Vector转换为16*16的二维Vector。

```verilog
module top_module(
    input clk,
    input load,
    input [255:0] data,
    output reg [255:0] q
);

    integer r, c;
    integer r_up, r_down, c_left, c_right;
    integer count;

    reg [255:0] next_q;

    always @(*) begin
        next_q = 256'b0;

        for (r = 0; r < 16; r = r + 1) begin
            for (c = 0; c < 16; c = c + 1) begin

          		// 获取当前cell的上下左右邻居的位置
                r_up   = (r == 0)  ? 15 : r - 1;
                r_down = (r == 15) ? 0  : r + 1;
                c_left = (c == 0)  ? 15 : c - 1;
                c_right= (c == 15) ? 0  : c + 1;
				
                // 获取全部存活的邻居数量
                count =
                    q[r_up*16   + c_left]  +
                    q[r_up*16   + c]        +
                    q[r_up*16   + c_right]  +
                    q[r*16      + c_left]  +
                    q[r*16      + c_right]  +
                    q[r_down*16 + c_left]  +
                    q[r_down*16 + c]        +
                    q[r_down*16 + c_right];

                if (count == 3)
                    next_q[r*16 + c] = 1'b1;
                else if (count == 2)
                    next_q[r*16 + c] = q[r*16 + c];
                else
                    next_q[r*16 + c] = 1'b0;
            end
        end
    end

    always @(posedge clk) begin
        if (load)
            q <= data;
        else
            q <= next_q;
    end

endmodule
```

## Finite State Machine

这部分我们将实现一些有限状态机。其设计思路如下：

- 确定全部的状态集合
- 画出状态转换图
- 构造三个部分：
    - 一个组合逻辑的always，用于确定下一个状态 next_state
    - 一个时序逻辑的always，用于更新当前状态
    - 一条语句，用于根据当前状态产生输出结果

![image.png](/images/posts/ysyx-e1/image%2028.png)

一个简单的FSM示例：

![image.png](/images/posts/ysyx-e1/image%2029.png)

![image.png](/images/posts/ysyx-e1/image%2030.png)

### **Fsm1**

![image.png](/images/posts/ysyx-e1/image%2031.png)

```verilog
module top_module(
    input clk,
    input areset,    // Asynchronous reset to state B
    input in,
    output out);//  

    parameter A=0, B=1; 
    reg state, next_state;

    always @(*) begin    // This is a combinational always block
        // State transition logic
        case (state)
            A: next_state = in ? A : B;
            B: next_state = in ? B : A;
        endcase
    end

    always @(posedge clk, posedge areset) begin    // This is a sequential always block
        // State flip-flops with asynchronous reset
        state <=  areset ? B : next_state;
    end

    // Output logic
    assign out = (state == B);
	
endmodule
```

### **Fsm1s**

![image.png](/images/posts/ysyx-e1/image%2032.png)

```verilog
module top_module(clk, reset, in, out);
    input clk;
    input reset;
    input in;
    output out;
    
    parameter A = 1'b0, B = 1'b1;
    reg state, next_state;
    
    // 1. 状态寄存器
    always @(posedge clk) begin
        if (reset)
            state <= B;
        else
            state <= next_state;
    end
    
    // 2. 下一状态逻辑（组合）
    always @(*) begin
        case (state)
            A: next_state = in ? A : B;
            B: next_state = in ? B : A;
            default: next_state = B;
        endcase
    end
    
    // 3. 输出逻辑（组合）
    assign out = (state == B);
    
endmodule
```

### **Fsm2**

![image.png](/images/posts/ysyx-e1/image%2033.png)

```verilog
module top_module(
    input clk,
    input areset,    // Asynchronous reset to OFF
    input j,
    input k,
    output out); //  

    parameter OFF=0, ON=1; 
    reg state, next_state;

    always @(*) begin
        // State transition logic
        case (state)
            ON: next_state = k ? OFF : ON;
            OFF: next_state = j ? ON : OFF;
        endcase
    end

    always @(posedge clk, posedge areset) begin
        // State flip-flops with asynchronous reset
        state <= areset ? OFF : next_state;
    end

    // Output logic
    assign out = (state == ON);

endmodule
```

### **Fsm2s**

仅将reset改为同步的，其余的同上题。

```verilog
module top_module(
    input clk,
    input reset,    // Asynchronous reset to OFF
    input j,
    input k,
    output out); //  

    parameter OFF=0, ON=1; 
    reg state, next_state;

    always @(*) begin
        // State transition logic
        case (state)
            ON: next_state = k ? OFF : ON;
            OFF: next_state = j ? ON : OFF;
        endcase
    end

    always @(posedge clk) begin
        // State flip-flops with asynchronous reset
        state <= reset ? OFF : next_state;
    end

    // Output logic
    assign out = (state == ON);

endmodule
```

### **Fsm3comb**

实现下面的组合逻辑电路，根据当前状态和输入，输出下一个状态和结果。

![image.png](/images/posts/ysyx-e1/image%2034.png)

```verilog
module top_module(
    input in,
    input [1:0] state,
    output [1:0] next_state,
    output out); //

    parameter A=0, B=1, C=2, D=3;
	
    // State transition logic: next_state = f(state, in)
    always @(*) begin
        case (state)
            A: next_state = in ? B : A;
            B: next_state = in ? B : C;
            C: next_state = in ? D : A;
            D: next_state = in ? B : C;
        endcase
    end
    // Output logic:  out = f(state) for a Moore state machine
	assign out = state == D;
  
endmodule
```

### **Fsm3onehot**

考虑：**next_state 的某一位在什么情况下会变成 1？**

以next_state[A]为例：A 在什么情况下会变成 1？

- 情况 1：当前是 A（`state[0]`），且 `in = 0`（留在 A）。
- 情况 2：当前是 C（`state[2]`），且 `in = 0`（从 C 回到 A）。

其余的状态也是类似的。

```verilog
module top_module(
    input in,
    input [3:0] state,
    output [3:0] next_state,
    output out
);
    parameter A = 0, B = 1, C = 2, D = 3;
    
    // 状态转移逻辑（One-Hot）
    // 每个位表示一个状态
    assign next_state[A] = (state[A] & ~in) | (state[C] & ~in);
    // A 的下一状态：从 A 或 C，且 in=0
    
    assign next_state[B] = (state[A] & in) | (state[B] & in) | (state[D] & in);
    // B 的下一状态：从 A、B 或 D，且 in=1
    
    assign next_state[C] = (state[B] & ~in) | (state[D] & ~in);
    // C 的下一状态：从 B 或 D，且 in=0
    
    assign next_state[D] = (state[C] & in);
    // D 的下一状态：从 C，且 in=1
    
    // 输出逻辑
    assign out = state[D];  // D 状态为 1
    
endmodule
```

### **Fsm3**

按下面的状态转换表设计电路：

![image.png](/images/posts/ysyx-e1/image%2035.png)

```verilog
module top_module(
    input clk,
    input in,
    input areset,
    output out); 
    
    parameter A = 0, B = 1, C = 2, D = 3;
    reg [1:0] state, next_state;
	
    // State transition logic
    always @(*) begin
        case (state)
            A: next_state = in ? B : A;
            B: next_state = in ? B : C;
            C: next_state = in ? D : A;
            D: next_state = in ? B : C;
        endcase
    end

    // State flip-flops with asynchronous reset
    always @(posedge clk or posedge areset) begin
        if (areset) 
            state <= A;
        else 
            state <= next_state;
    end

    // Output logic
    assign out = (state == D);

endmodule
```

### **Fsm3s**

同上，reset改为同步。

```verilog
module top_module(
    input clk,
    input in,
    input reset,
    output out); 
    
    parameter A = 0, B = 1, C = 2, D = 3;
    reg [1:0] state, next_state;
	
    // State transition logic
    always @(*) begin
        case (state)
            A: next_state = in ? B : A;
            B: next_state = in ? B : C;
            C: next_state = in ? D : A;
            D: next_state = in ? B : C;
        endcase
    end

    // State flip-flops with asynchronous reset
    always @(posedge clk) begin
        if (reset) 
            state <= A;
        else 
            state <= next_state;
    end

    // Output logic
    assign out = (state == D);

endmodule
```

### **Lemmings1**

在旅鼠的二维世界里，旅鼠只有两种状态：向左走或向右走。

如果撞到障碍物，它们会改变方向:

- 如果旅鼠的左侧被撞到，它会向右走；
- 如果右侧被撞到，它会向左走；
- 如果两侧同时被撞到，它仍然会改变方向。

reset后旅鼠的状态会变成为LEFT。

```verilog
module top_module(
    input clk,
    input areset,    // Freshly brainwashed Lemmings walk left.
    input bump_left,
    input bump_right,
    output walk_left,
    output walk_right); //  

    parameter LEFT=0, RIGHT=1;
    reg state, next_state;

    always @(*) begin
        // State transition logic
        case (state)
            LEFT: next_state = bump_left ? RIGHT : LEFT;
            RIGHT: next_state = bump_right ? LEFT : RIGHT;
        endcase
    end

    always @(posedge clk, posedge areset) begin
        // State flip-flops with asynchronous reset
        if (areset) 
            state <= LEFT;
        else
            state <= next_state;
    end

    // Output logic
    assign walk_left = (state == LEFT);
    assign walk_right = (state == RIGHT);

endmodule
```

### **Lemmings2**

除了左右行走之外，如果脚下的地面消失，旅鼠还会摔倒（并可能发出“啊！”的叫声）。

除了左右行走和碰撞后改变方向外，当地面为0时，旅鼠会摔倒并发出“啊！”的叫声。当地面重新出现（地面为1）时，旅鼠会恢复到摔倒前的方向继续行走。在摔倒过程中被碰撞不会影响行走方向，在地面消失（但尚未摔倒）的同一周期内被碰撞，或者在仍在摔倒时地面重新出现时被碰撞，也不会影响行走方向。

![image.png](/images/posts/ysyx-e1/image%2036.png)

```verilog
module top_module(
    input clk,
    input areset,
    input bump_left,
    input bump_right,
    input ground,
    output walk_left,
    output walk_right,
    output aaah
);

    parameter LEFT = 0, RIGHT = 1, FALL_L = 2, FALL_R = 3;

    reg [1:0] state, next_state;

    // State transition logic
    always @(*) begin
        case (state)

            LEFT: begin
                if (!ground)
                    next_state = FALL_L;
                else if (bump_left)
                    next_state = RIGHT;
                else
                    next_state = LEFT;
            end

            RIGHT: begin
                if (!ground)
                    next_state = FALL_R;
                else if (bump_right)
                    next_state = LEFT;
                else
                    next_state = RIGHT;
            end

            FALL_L: begin
                if (ground)
                    next_state = LEFT;
                else
                    next_state = FALL_L;
            end

            FALL_R: begin
                if (ground)
                    next_state = RIGHT;
                else
                    next_state = FALL_R;
            end

            default:
                next_state = LEFT;

        endcase
    end

    // State register with asynchronous reset
    always @(posedge clk or posedge areset) begin
        if (areset)
            state <= LEFT;
        else
            state <= next_state;
    end

    // Moore output logic
    assign walk_left  = (state == LEFT);
    assign walk_right = (state == RIGHT);
    assign aaah       = (state == FALL_L) | (state == FALL_R);

endmodule
```

### **Lemmings3**

除了行走和跌倒之外，旅鼠有时还可以被命令做一些有用的事情，比如挖洞（当dig=1时开始挖洞）。旅鼠在地面上行走（ground=1且未跌倒）时可以挖洞，并会一直挖到另一边（ground=0）。此时，由于地面已空，旅鼠会跌倒（啊！），然后再次着地后会继续沿原路行走。与跌倒一样，在挖洞时被碰撞不会产生任何影响，并且在跌倒或地面已空时被命令挖洞也会被忽略。

换句话说，一只行走的旅鼠可能会摔倒、挖洞或改变方向。如果满足其中多个条件，**摔倒的优先级高于挖洞**，而**挖洞的优先级又高于改变方向**。

```verilog
module top_module(
    input clk,
    input areset,
    input bump_left,
    input bump_right,
    input ground,
    input dig,
    output walk_left,
    output walk_right,
    output aaah,
    output digging
);
		
		// 新增2个挖洞的状态
    parameter LEFT  = 0,
              RIGHT = 1,
              DIG_L = 2,
              DIG_R = 3,
              FALL_L = 4,
              FALL_R = 5;

    reg [2:0] state, next_state;

    // State transition logic
    always @(*) begin
        case (state)

            LEFT: begin
                // Falling has highest priority
                if (!ground)
                    next_state = FALL_L;
                // Digging has second priority
                else if (dig)
                    next_state = DIG_L;
                // Bumping has lowest priority
                else if (bump_left)
                    next_state = RIGHT;
                else
                    next_state = LEFT;
            end

            RIGHT: begin
                if (!ground)
                    next_state = FALL_R;
                else if (dig)
                    next_state = DIG_R;
                else if (bump_right)
                    next_state = LEFT;
                else
                    next_state = RIGHT;
            end

            DIG_L: begin
                if (!ground)
                    next_state = FALL_L;
                else
                    next_state = DIG_L;
            end

            DIG_R: begin
                if (!ground)
                    next_state = FALL_R;
                else
                    next_state = DIG_R;
            end

            FALL_L: begin
                if (ground)
                    next_state = LEFT;
                else
                    next_state = FALL_L;
            end

            FALL_R: begin
                if (ground)
                    next_state = RIGHT;
                else
                    next_state = FALL_R;
            end

            default:
                next_state = LEFT;

        endcase
    end

    // State register
    always @(posedge clk or posedge areset) begin
        if (areset)
            state <= LEFT;
        else
            state <= next_state;
    end

    // Moore outputs
    assign walk_left  = (state == LEFT);
    assign walk_right = (state == RIGHT);
    assign digging    = (state == DIG_L) | (state == DIG_R);
    assign aaah       = (state == FALL_L) | (state == FALL_R);

endmodule
```

### **Lemmings4**

虽然旅鼠可以行走、跌倒和挖掘，但它们并非刀枪不入。如果旅鼠下落时间过长，落地后就会摔碎。具体来说，如果旅鼠下落超过 20 个时钟周期后落地，它就会摔碎，并且永远停止行走、下落或挖掘（所有 4 个输出都变为 0）（或者直到有限状态机被重置）。旅鼠下落的距离没有上限。旅鼠只有在落地时才会摔碎；它们不会在空中摔碎。

考虑增加一个变量用于计数，当旅鼠位于坠落状态时不断递增，退出坠落状态后该变量置为0。

新增状态SPLAT，表示死亡，在更新状态时，若发现坠落时长超过20，旅鼠进入死亡状态。

```verilog
module top_module(
    input clk,
    input areset,
    input bump_left,
    input bump_right,
    input ground,
    input dig,
    output walk_left,
    output walk_right,
    output aaah,
    output digging
);

    parameter LEFT   = 3'd0,
              RIGHT  = 3'd1,
              DIG_L  = 3'd2,
              DIG_R  = 3'd3,
              FALL_L = 3'd4,
              FALL_R = 3'd5,
              SPLAT  = 3'd6;

    reg [2:0] state, next_state;
    reg [4:0] fall_count;

    // State transition logic
    always @(*) begin
        case (state)

            LEFT: begin
                // Falling has highest priority
                if (!ground)
                    next_state = FALL_L;
                // Digging has second priority
                else if (dig)
                    next_state = DIG_L;
                // Bumping has lowest priority
                else if (bump_left)
                    next_state = RIGHT;
                else
                    next_state = LEFT;
            end

            RIGHT: begin
                if (!ground)
                    next_state = FALL_R;
                else if (dig)
                    next_state = DIG_R;
                else if (bump_right)
                    next_state = LEFT;
                else
                    next_state = RIGHT;
            end

            DIG_L: begin
                if (!ground)
                    next_state = FALL_L;
                else
                    next_state = DIG_L;
            end

            DIG_R: begin
                if (!ground)
                    next_state = FALL_R;
                else
                    next_state = DIG_R;
            end

            FALL_L: begin
                if (ground) begin
                    if (fall_count > 5'd20)
                        next_state = SPLAT;
                    else
                        next_state = LEFT;
                end
                else begin
                    next_state = FALL_L;
                end
            end

            FALL_R: begin
                if (ground) begin
                    if (fall_count > 5'd20)
                        next_state = SPLAT;
                    else
                        next_state = RIGHT;
                end
                else begin
                    next_state = FALL_R;
                end
            end

            SPLAT: begin
                next_state = SPLAT;
            end

            default: begin
                next_state = LEFT;
            end

        endcase
    end

    // State register
    always @(posedge clk or posedge areset) begin
        if (areset)
            state <= LEFT;
        else
            state <= next_state;
    end
		
    // Fall counter
    always @(posedge clk or posedge areset) begin
        if (areset)
            fall_count <= 5'd0;
        else if (next_state == FALL_L || next_state == FALL_R) begin
            if (fall_count < 5'd21)
                fall_count <= fall_count + 5'd1;
        end
        else
            fall_count <= 5'd0;
    end

    // Moore outputs
    assign walk_left  = (state == LEFT);
    assign walk_right = (state == RIGHT);
    assign aaah       = (state == FALL_L) || (state == FALL_R);
    assign digging    = (state == DIG_L) || (state == DIG_R);

endmodule
```

### **Fsm onehot**

思路同前面的onehot题差不多。

![image.png](/images/posts/ysyx-e1/image%2037.png)

```verilog
module top_module(
    input in,
    input [9:0] state,
    output [9:0] next_state,
    output out1,
    output out2
);

    assign next_state[0] =
        ~in & (state[0] | state[1] | state[2] |
               state[3] | state[4] |
               state[7] | state[8] | state[9]);

    assign next_state[1] =
        in & (state[0] | state[8] | state[9]);

    assign next_state[2] = in & state[1];

    assign next_state[3] = in & state[2];

    assign next_state[4] = in & state[3];

    assign next_state[5] = in & state[4];

    assign next_state[6] = in & state[5];

    assign next_state[7] =
        in & (state[6] | state[7]);

    assign next_state[8] =
        ~in & state[5];

    assign next_state[9] =
        ~in & state[6];

    assign out1 = state[8] | state[9];

    assign out2 = state[7] | state[9];

endmodule
```

### **Fsm ps2**

定义 4 个状态：

- `WAIT`：还没有找到第 1 个 byte
- `BYTE1`：已经收到第 1 个 byte，等待第 2 个
- `BYTE2`：已经收到第 2 个 byte，等待第 3 个
- `DONE`：第 3 个 byte 刚刚收到，当前周期输出 `done=1`

状态转移：

```verilog
WAIT:
    in[3] == 0 → WAIT
    in[3] == 1 → BYTE1

BYTE1:
    任意输入 → BYTE2

BYTE2:
    任意输入 → DONE

DONE:
    任意输入 → WAIT
```

```verilog
module top_module(
    input clk,
    input [7:0] in,
    input reset,
    output done
);

    parameter WAIT  = 2'd0,
              BYTE1 = 2'd1,
              BYTE2 = 2'd2,
              DONE  = 2'd3;

    reg [1:0] state, next_state;
		
    always @(*) begin
        case (state)
            WAIT: begin
                if (in[3])
                    next_state = BYTE1;
                else
                    next_state = WAIT;
            end

            BYTE1: begin
                next_state = BYTE2;
            end
						
            BYTE2: begin
                next_state = DONE;
            end

            DONE: begin
                if (in[3])
                    next_state = BYTE1;
                else
                    next_state = WAIT;
            end
						
            default:
                next_state = WAIT;
        endcase
    end
		
    always @(posedge clk) begin
        if (reset)
            state <= WAIT;
        else
            state <= next_state;
    end
		
    assign done = (state == DONE);

endmodule
```

### **Fsm ps2data**

增加一个24bits的寄存器，将收到的数据存储起来，在接收完毕后进行输出。

```verilog
module top_module(
    input clk,
    input [7:0] in,
    input reset,
    output [23:0] out_bytes,
    output done
);

    parameter BYTE1 = 2'd0,
              BYTE2 = 2'd1,
              BYTE3 = 2'd2,
              DONE  = 2'd3;

    reg [1:0] state, next_state;

    // FSM state transition
    always @(*) begin
        case (state)
            BYTE1:
                next_state = in[3] ? BYTE2 : BYTE1;

            BYTE2:
                next_state = BYTE3;

            BYTE3:
                next_state = DONE;

            DONE:
                next_state = in[3] ? BYTE2 : BYTE1;

            default:
                next_state = BYTE1;

        endcase
    end

    // State register
    always @(posedge clk) begin
        if (reset)
            state <= BYTE1;
        else
            state <= next_state;
    end

    // Output
    assign done = (state == DONE);

    // Datapath
    reg [7:0] in_r0;
    reg [7:0] in_r1;
    reg [7:0] in_r2;
	
    always @(posedge clk) begin
        if (reset) begin
            in_r0 <= 8'd0;
            in_r1 <= 8'd0;
            in_r2 <= 8'd0;
        end
        else begin
            in_r0 <= in;
            in_r1 <= in_r0;
            in_r2 <= in_r1;
        end
    end

    assign out_bytes = {in_r2, in_r1, in_r0};

endmodule
```

### **Fsm serial**

定义11个状态：

```verilog
IDLE
START
S1
S2
S3
S4
S5
S6
S7
S8
STOP
WAIT
```

解释：

- IDLE  : 等待 start bit（0）
- START : 已经检测到 start bit
- S1~S8 : 依次等待 8 个 data bit
- STOP  : 检查 stop bit
- WAIT  : stop bit 错误，等待线路重新变成 1

状态转移：

```verilog
IDLE
 ├─ in=1 → IDLE
 └─ in=0 → START

START → S1
S1 → S2
S2 → S3
S3 → S4
S4 → S5
S5 → S6
S6 → S7
S7 → S8

S8
 ├─ in=1 → STOP
 └─ in=0 → WAIT

STOP
 ├─ in=1 → IDLE
 └─ in=0 → START

WAIT
 ├─ in=1 → IDLE
 └─ in=0 → WAIT
```

```verilog
module top_module(
    input clk,
    input in,
    input reset,
    output done
);

    parameter IDLE  = 4'd0,
              START = 4'd1,
              S1    = 4'd2,
              S2    = 4'd3,
              S3    = 4'd4,
              S4    = 4'd5,
              S5    = 4'd6,
              S6    = 4'd7,
              S7    = 4'd8,
              S8    = 4'd9,
              STOP  = 4'd10,
              WAIT  = 4'd11;

    reg [3:0] state, next_state;

    // State transition logic
    always @(*) begin
        case (state)

            IDLE:
                next_state = in ? IDLE : START;

            START:
                next_state = S1;

            S1:
                next_state = S2;

            S2:
                next_state = S3;

            S3:
                next_state = S4;

            S4:
                next_state = S5;

            S5:
                next_state = S6;

            S6:
                next_state = S7;

            S7:
                next_state = S8;

            S8:
                next_state = in ? STOP : WAIT;

            STOP:
                next_state = in ? IDLE : START;

            WAIT:
                next_state = in ? IDLE : WAIT;

            default:
                next_state = IDLE;

        endcase
    end

    // State register
    always @(posedge clk) begin
        if (reset)
            state <= IDLE;
        else
            state <= next_state;
    end

    // Output
    assign done = (state == STOP);

endmodule
```

### **Fsm serialdata**

这题是在上一题的 FSM 上**增加一个 8-bit datapath**。

**串口协议是 LSB first，所以第 1 个收到的数据 bit 应该放到 `out_byte[0]`，第 2 个放到 `out_byte[1]`，……第 8 个放到 `out_byte[7]`。**

```verilog
module top_module(
    input clk,
    input in,
    input reset,
    output [7:0] out_byte,
    output done
);

    parameter IDLE  = 4'd0,
              START = 4'd1,
              S1    = 4'd2,
              S2    = 4'd3,
              S3    = 4'd4,
              S4    = 4'd5,
              S5    = 4'd6,
              S6    = 4'd7,
              S7    = 4'd8,
              S8    = 4'd9,
              STOP  = 4'd10,
              WAIT  = 4'd11;

    reg [3:0] state, next_state;

    // 10-bit serial frame:
    // start + 8 data bits + stop
    reg [9:0] data;

    // =========================================================
    // FSM：完全使用你已经验证正确的 FSM
    // =========================================================
    always @(*) begin
        case (state)

            IDLE:
                next_state = in ? IDLE : START;

            START:
                next_state = S1;

            S1:
                next_state = S2;

            S2:
                next_state = S3;

            S3:
                next_state = S4;

            S4:
                next_state = S5;

            S5:
                next_state = S6;

            S6:
                next_state = S7;

            S7:
                next_state = S8;

            S8:
                next_state = in ? STOP : WAIT;

            STOP:
                next_state = in ? IDLE : START;

            WAIT:
                next_state = in ? IDLE : WAIT;

            default:
                next_state = IDLE;

        endcase
    end

    // =========================================================
    // State register
    // =========================================================
    always @(posedge clk) begin
        if (reset)
            state <= IDLE;
        else
            state <= next_state;
    end

    // =========================================================
    // Datapath
    //
    // 每一个 clock 都采样 in
    //
    // data <= {in, data[9:1]}
    //
    // 接收到：
    //
    // start d0 d1 d2 d3 d4 d5 d6 d7 stop
    //
    // 最终：
    //
    // data[9] = stop
    // data[8] = d7
    // data[7] = d6
    // ...
    // data[1] = d0
    // data[0] = start
    //
    // 因此 data[8:1] 正好就是 d7...d0
    // =========================================================
    always @(posedge clk) begin
        if (reset)
            data <= 10'd0;
        else
            data <= {in, data[9:1]};
    end

    // =========================================================
    // Output
    // =========================================================
    assign done = (state == STOP);

    assign out_byte = data[8:1];

endmodule
```

### **Fsm serialdp**

```verilog
module top_module(
    input clk,
    input in,
    input reset,
    output [7:0] out_byte,
    output done
);

    parameter IDLE       = 4'd0,
              START      = 4'd1,
              S1         = 4'd2,
              S2         = 4'd3,
              S3         = 4'd4,
              S4         = 4'd5,
              S5         = 4'd6,
              S6         = 4'd7,
              S7         = 4'd8,
              S8         = 4'd9,
              STOP_CHECK = 4'd10,
              STOP       = 4'd11,
              WAIT       = 4'd12;

    reg [3:0] state, next_state;

    reg [7:0] data;
    reg parity_ok;

    wire odd;

    // =====================================================
    // FSM
    // =====================================================
    always @(*) begin
        case (state)

            IDLE:
                next_state = in ? IDLE : START;

            START:
                next_state = S1;

            S1:
                next_state = S2;

            S2:
                next_state = S3;

            S3:
                next_state = S4;

            S4:
                next_state = S5;

            S5:
                next_state = S6;

            S6:
                next_state = S7;

            S7:
                next_state = S8;

            // S8 对应 parity bit
            S8:
                next_state = STOP_CHECK;

            // STOP_CHECK 对应 stop bit
            STOP_CHECK:
                next_state = in ? STOP : WAIT;

            // stop 正确
            STOP:
                next_state = in ? IDLE : START;

            // stop 错误，等待出现 1
            WAIT:
                next_state = in ? IDLE : WAIT;

            default:
                next_state = IDLE;

        endcase
    end

    // =====================================================
    // State register
    // =====================================================
    always @(posedge clk) begin
        if (reset)
            state <= IDLE;
        else
            state <= next_state;
    end

    // =====================================================
    // Data datapath
    //
    // START : d0
    // S1    : d1
    // S2    : d2
    // ...
    // S7    : d7
    // S8    : parity
    // =====================================================
    always @(posedge clk) begin
        if (reset) begin
            data <= 8'd0;
        end
        else begin
            case (state)
                START: data[0] <= in;
                S1:    data[1] <= in;
                S2:    data[2] <= in;
                S3:    data[3] <= in;
                S4:    data[4] <= in;
                S5:    data[5] <= in;
                S6:    data[6] <= in;
                S7:    data[7] <= in;
            endcase
        end
    end

    assign out_byte = data;

    // =====================================================
    // Odd parity checker
    //
    // 只统计：
    //
    // d0 d1 d2 d3 d4 d5 d6 d7 parity
    //
    // 不统计 start / stop / idle
    // =====================================================
    parity parity_check (
        .clk   (clk),
        .reset (reset ||
                (state == IDLE) ||
                (state == STOP) ||
                (state == WAIT)),
        .in    (in),
        .odd   (odd)
    );

    // =====================================================
    // 在 STOP_CHECK 时保存 parity 结果
    // =====================================================
    always @(posedge clk) begin
        if (reset)
            parity_ok <= 1'b0;
        else if (state == STOP_CHECK)
            parity_ok <= odd;
    end
		
    // =====================================================
    // done:
    //
    // 1. stop bit 正确 -> state == STOP
    // 2. 9 个 data/parity bits 是 odd parity -> parity_ok
    // =====================================================
    assign done = (state == STOP) && parity_ok;
		
endmodule
```

<aside>
💡

关于FSM的训练已经差不多了，我已经熟悉了FSM的构建思路和实现策略，后面大约还剩10道题，就不再继续做了。

</aside>