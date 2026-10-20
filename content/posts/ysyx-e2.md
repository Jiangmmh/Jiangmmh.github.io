---
title: "一生一芯-E2阶段笔记"
date: '2026-10-20T18:23:11+08:00'
draft: false
tags: [C语言]
categories: [一生一芯]
---

这一阶段的目的是让我们学会使用C语言编程。因为我已经有丰富的C语言编程经验，所以学习材料中我比较熟悉的内容就一笔带过甚至不记录，仅记录对我来说有价值的内容。

- 在线运行C语言的网站：[godbolt](https://godbolt.org/)

- 学习教材：[《Linux C 编程一站式学习》](https://akaedu.github.io/book/index.html)


本书包括三大部分：

- C语言入门。介绍基本的C语法，帮助没有任何编程经验的读者理解什么是程序，怎么写程序，培养程序员的思维习惯，找到编程的感觉。前半部分改编自[[ThinkCpp]](https://akaedu.github.io/book/bi01.html#bibli.thinkcpp)。
- C语言本质。结合计算机和操作系统的原理讲解C程序是怎么编译、链接、运行的，同时全面介绍C的语法。位运算的章节改编自亚嵌教育林小竹老师的讲义，链表和二叉树的章节改编自亚嵌教育朱老师的讲义。汇编语言的章节改编自[[GroudUp]](https://akaedu.github.io/book/bi01.html#bibli.groundup)，在该书的最后一章提到，学习编程有两种Approach，一种是Bottom Up，一种是Top Down，各有优缺点，需要两者结合起来。所以我编这本书的思路是，第一部分Top Down，第二部分Bottom Up，第三部分可以算填了中间的空隙，三部分全都围绕C语言展开。
- Linux系统编程。介绍各种Linux系统函数和内核的工作原理。Socket编程的章节改编自亚嵌教育卫剑钒老师的讲义。

> C语言是一种面向底层的编程语言，要写好C程序，必须对操作系统的工作原理非常清楚，因为操作系统也是用C写的，我们用C写应用程序直接使用操作系统提供的接口。
> 

> Linux是一种开源的操作系统，你有任何疑问都可以从源代码和文档中找到答案，即使你看不懂源代码，也找不到文档，也很容易找个高手教你，各种邮件列表、新闻组和论坛上从来都不缺乐于助人的高手；而Windows是一种封闭的操作系统，除了微软的员工别人都看不到它的源代码，只能通过文档去猜测它的工作原理，更糟糕的是，微软向来喜欢藏着揶着，好用的功能留着自己用，而不会写到文档里公开。
> 

## 1. 程序和编程语言

程序 = 一组指令序列指令，指令无外乎以下几类：

- 输入指令，从外部设备读入数据
- 输出指令，向外部设备输出数据
- 基本运算，执行算数逻辑运算和访问
- 测试和分支指令，根据当前状态选择不同的指令执行路径
- 循环指令，重复执行一组操作

无论程序如何复杂，最终都会落到这些些指令上。

> 编写程序可以说就是这样一个过程：把复杂的任务分解成子任务，把子任务再分解成更简单的任务，层层分解，直到最后简单得可以用以上指令来完成。
> 

**平台 = 体系结构 + 操作系统 + 开发库（编译器和链接器）**

高级语言是平台无关的，所以绝大部分程序是用高级语言编写的，只有和硬件关系密切的少数程序（例如驱动程序）才会用到低级语言。

**注意**：即使在相同的体系结构和操作系统下，用不同的C编译器（或者同一个C编译器的不同版本）编译同一个程序得到的结果也有可能不同，**C语言有些语法特性在C标准中并没有明确规定**，**各编译器有不同的实现，编译出来的指令的行为特性也会不同，应该尽量避免使用不可移植的语法特性**。

> **总结：程序**由**语句**或**指令**组成，计算机只能执行**低级语言**中的**指令**（汇编语言的指令要先转成机器码才能执行），**高级语言**要执行就必须先翻译成低级语言，翻译的方法有两种－－**编译**和**解释**，虽然有这样的不便，但高级语言有一个好处是**平台无关性**。
> 

<aside>
💡

习题：解释执行的语言相比编译执行的语言有什么优缺点？

</aside>

背景知识：高级语言提供了较高的抽象，大大提高了程序员开发软件的效率，但是机器只能执行一组简单的指令，所以必须先将高级语言程序翻译为机器代码。

在讨论编译和解释的优缺点之前，先认识一下两者的基本概念：

- **解释**：每读取一条命令，就立即将其翻译为机器代码进行执行，直至执行完毕或出现错误
- **编译**：先从头到尾读取源文件，将其翻译为机器代码，然后再执行

解释相比编译执行的优缺点：

- 优点：非常灵活，在源文件被修改之后无需重新编译
- 缺点：在运行时进行翻译，性能不如编译执行，并且无法在程序运行前检查出程序中的错误

---

形式语言（Formal Language）是为了特定应用而人为设计的语言，它必须按照特定的格式进行表达。例如数学家用的数字和运算符号、化学家用的分子式等。**编程语言也是一种形式语言，是专门设计用来表达计算过程的形式语言。**

**语法规则 = 由符号（Token，词法）+ 结构（Structure，语法）**

> 从某种角度看调试就像侦探工作，根据掌握的线索来推断是什么原因和过程导致了你所看到的结果。调试也像是一门实验科学，每次想到哪里可能有错，就修改程序然后再试一次。如果假设是对的，就能得到预期的正确结果，就可以接着调试下一个Bug，一步一步逼近正确的程序；如果假设错误，只好另外再找思路再做假设。“当你把不可能的全部剔除，剩下的——即使看起来再怎么不可能——就一定是事实。”
> 

编程和调试是一回事，**编程的过程就是逐步调试直到获得期望的结果为止**。你应该总是从一个能正确运行的小规模程序开始，每做一步小的改动就立刻进行调试，这样的好处是总有一个正确的程序做参考：如果正确就继续编程，如果不正确，那么一定是刚才的小改动出了问题。

> 例如，**Linux操作系统包含了成千上万行代码，但它也不是一开始就规划好了内存管理、设备管理、文件系统、网络等等大的模块，一开始它仅仅是Linus Torvalds用来琢磨Intel 80386芯片而写的小程序**。据Larry Greenfield 说，“Linus的早期工程之一是编写一个交替打印AAAA和BBBB的程序，这玩意儿后来进化成了Linux。”（引自The Linux User's Guide Beta1版）在后面的章节中会给出更多关于调试和编程实践的建议。
> 

在编译时，警告信息是不容忽视的。**出警告信息说明你的程序写得不够规范，可能有Bug，虽然能编译生成可执行文件，但程序的运行结果往往是不正确的**，例如上面的程序运行时出了一个段错误，这属于运行时错误。

**一个好的习惯是打开`gcc`的`-Wall`选项，也就是让`gcc`提示所有的警告信息，不管是严重的还是不严重的，然后把这些问题从代码中全部消灭。**

## 2. **常量、变量和表达式**

> “代码首先是给人看的，只是偶尔交给机器运行”。丑陋的代码虽然能够通过编译，但糟糕的可读性会使后续的开发和维护异常艰难。因此请养成好习惯，使用良好的代码风格编写代码。
> 

变量（Variable）是编程语言最重要的概念之一，变量是计算机内存中的一块命名的空间（有地址），可以在里面存储一个值（Value），这个值是可以随时变的，比如这次存个字符`'a'`下次存个字符`'b'`，正因为变量的值可以随时变所以才叫变量。

> **初始化是一种特殊的声明，而不是一种赋值语句**
> 

> **练习**：假设变量`x`和`n`是两个正整数，我们知道`x/n`这个表达式的结果要取Floor，例如`x`是17，`n`是4，则结果是4。如果希望结果取Ceiling应该怎么写表达式呢？例如`x`是17，`n`是4，则结果是5；`x`是16，`n`是4，则结果是4。
> 

```c
#include <stdio.h>

int ceil_div(int a, int b) {
    return (a + b - 1) / b;
} 

int main() {
    int a1 = 17, b1 = 4;
    printf("%d / %d = %d\n", a1, b1, ceil_div(a1, b1));

    int a2 = 16, b2 = 4;
    printf("%d / %d = %d\n", a2, b2, ceil_div(a2, b2));

    return 0;
}
```

运行测试：

```bash
xi@tanxi:~/Compiler/jlox$ gcc test.c && ./a.out && rm a.out
17 / 4 = 5
16 / 4 = 4
```

> 我们把`char`型和`int`型统称为整数类型（Integer Type）或简称整型。
> 

C语言中的整型有：char，short，int，long，long long + unsinged版本

> C标准主要由两部分组成，一部分描述**C的语法**，另一部分描述**C标准库**。**C标准库定义了一组标准头文件，每个头文件中包含一些相关的函数、变量、类型声明和宏定义**。要在一个平台上支持C语言，不仅要实现C编译器，还要实现C标准库，这样的实现才算符合C标准。不符合C标准的实现也是存在的，例如很多单片机的C语言开发工具中只有C编译器而没有完整的C标准库。
> 

## **3. 简单函数**

**C语言的函数可以有Side Effect，这一点是它和数学函数在概念上的根本区别**。

> **读代码的过程就是模仿计算机执行程序的过程**，我们不仅要记住当前读到了哪一行代码，还要记住现在读的代码是被哪个函数调用的，这段代码返回后应该从上一个函数的什么地方接着往下读。
> 

> **形参相当于函数中定义的变量**，调用函数传递参数的过程相当于定义形参变量并且用实参的值来初始化
> 

> **练习**：定义了一个函数`increment`，它的作用是把传进来的参数加1。我们在`main`函数中调用`increment`增加变量`i`和`j`的值，这样能奏效吗？为什么？
> 

```c
void increment(int x)
{
	x = x + 1;
}

int main(void)
{
	int i = 1, j = 2;
	increment(i); /* i now becomes 2 */
	increment(j); /* j now becomes 3 */
	return 0;
}
```

无法奏效，main函数中的i和j的值不会因为调用increment函数而发生变化，因为increment函数中修改的是形参的值，不会影响main函数中的变量值。

> 练习：如果在一个程序中调用了`printf`函数却不包含头文件，例如`int main(void) { printf("\n"); }`，编译时会报警告：`warning: incompatible implicit declaration of built-in function ‘printf’`。请分析错误原因。
> 

```c
int main() {
    printf("hello\n");

    return 0;
}
```

```bash
xi@tanxi:~/Compiler/jlox$ gcc test.c && ./a.out && rm a.out
17 / 4 = 5
16 / 4 = 4
xi@tanxi:~/Compiler/jlox$ gcc test.c 
test.c: In function ‘main’:
test.c:4:5: warning: implicit declaration of function ‘printf’ [-Wimplicit-function-declaration]
    4 |     printf("hello\n");
      |     ^~~~~~
test.c:1:1: note: include ‘<stdio.h>’ or provide a declaration of ‘printf’
  +++ |+#include <stdio.h>
    1 | 
test.c:4:5: warning: incompatible implicit declaration of built-in function ‘printf’ [-Wbuiltin-declaration-mismatch]
    4 |     printf("hello\n");
      |     ^~~~~~
test.c:4:5: note: include ‘<stdio.h>’ or provide a declaration of ‘printf’
xi@tanxi:~/Compiler/jlox$ ./a.out 
hello
```

之所以报这个错误，是因为printf是标准库提供的函数，因为没有包含头文件stdio.h，编译器在编译该程序时无法找到该名字被定义在哪，因而报错。

没有包含 `stdio.h` 却仍能编译、链接并运行，是因为 **C 语言允许“隐式函数声明”，而 `printf` 恰好又在标准 C 库里存在**。编译器和链接器分别“放行”了它。

> **局部变量可以用类型相符的任意表达式来初始化，而全局变量只能用常量表达式（Constant Expression）初始化。**
> 

全局变量的生命周期是从程序加载到程序结束，而局部变量是从其在函数/block中被定义到函数/block执行结束。

> 如果**全局变量在定义时不初始化则初始值是0（默认初始化）**，如果局部变量在定义时不初始化则初始值是不确定的。所以，**局部变量在使用之前一定要先赋值**。
> 

测试局部变量的未定义行为：

```c
#include <stdio.h>

void foo(void)
{
	int i;
	printf("%d\n", i);
	i = 777;
}

int main(void)
{
	foo();
	foo();
	return 0;
}
```

```bash
xi@tanxi:~/Compiler/jlox$ gcc test.c && ./a.out && rm a.out
32539
777
xi@tanxi:~/Compiler/jlox$ gcc test.c && ./a.out && rm a.out
31788
777
xi@tanxi:~/Compiler/jlox$ gcc test.c && ./a.out && rm a.out
28748
777
```

为什么第一次调用foo输出的值是变化的，而第二次总是777？这是因为连续调用了两次foo，在第一次调用foo时将局部变量i所处的内存置为777，下次调用foo时，i再次被分配到同样的位置，该位置的值仍是777，其中的细节藏在在于栈的增长和收缩中。

## 4. **分支语句**

> 练习：以下程序段编译能通过，执行也不出错，但是执行结果不正确（根据[第 3 节 “程序的调试”](https://akaedu.github.io/book/ch01s03.html#intro.debug)的定义，这是一个语义错误），请分析一下哪里错了。还有，既然错了为什么编译能通过呢？
> 

```bash
int x = -1;
if (x > 0);
	printf("x is positive.\n");
```

该程序的原意是当x大于0是打印字符串，但是**在if后多了一个分号**，导致if提前结束，这就造成了无论x的值是什么，都会打印该字符串。

> 
> 
> 
> 练习：
> 
> 1、写两个表达式，分别取整型变量`x`的个位和十位。
> 
> 2、写一个函数，参数是整型变量`x`，功能是打印`x`的个位和十位。
> 

表达式：

```c
int x = 99;
int d1 = x % 10;
int d2 = x / 10 % 10;
```

函数：

```c
void print_lower(int x) {
	printf("%d %d", x % 10, x / 10 % 10);	
}
```

## **5. 深入理解函数**

> 解决问题的过程是把大的问题分成小的问题，小的问题再分成更小的问题，这个过程在代码中的体现就是函数的分层设计（Stratify）。
> 

**尽可能复用（Reuse）以前写的代码，避免写重复的代码**。封装就是为了复用，把解决各种小问题的代码封装成函数，在解决第一个大问题时可以用这些函数，在解决第二个大问题时可以复用这些函数。

> 关键思想：将小问题的解决方案模块化，之后不再关注模块中的实现细节，而是在该模块的抽象之上进行思考。
> 

---

操作系统为程序的运行预留了一块栈空间（用户栈），函数调用时就在这个栈空间里分配栈帧，函数返回时就释放栈帧。

**递归的真谛：相信递归函数能完成它该完成的任务。如果你相信你正在写的递归函数是正确的，并调用它，然后在此基础上写完这个递归函数，那么它就会是正确的，从而值得你相信它正确。**

编写递归函数的思路：

- 先写Base case，即该函数要面临的最小的、最简单的问题
- 然后假设该递归函数能够完成自己的任务，在当前层次上构建逻辑

> 练习：编写递归函数求两个正整数`a`和`b`的最大公约数（GCD，Greatest Common Divisor），使用Euclid算法。
> 

```c
int gcd(int a, int b) {
    if (b == 0) {
        return a;
    }
    return gcd(b, a % b);
}
```

> 练习：编写递归函数求Fibonacci数列的第`n`项
> 

```c
int fib(int n) {
    if (n < 2) {
        return 1;
    }
    return fib(n-1) + fib(n-2);
}
```

有一个重要的结论就是**递归和循环是等价的**，用循环能做的事用递归都能做，反之亦然，事实上有的编程语言（比如某些LISP实现）只有递归而没有循环。

## 6. 循环语句

> 练习：编写程序数一下1到100的所有整数中出现多少次数字9。在写程序之前先把这些问题考虑清楚。
> 

```c
int count_nine() {
    int cnt = 0;
    for (int i = 1; i < 100; i++) {
        int t = i;
        while (t != 0) {
            if (t % 10 == 9) {
                cnt++;
            }
            t /= 10;
        }
    }

    return cnt;
}
```

一共出现20次9。

> 练习：打印99乘法表。
> 

```c
	#include <stdio.h>

void print_table() {
    int n = 9;
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= i; j++) {
            printf("%d\t", i * j);
        }
        printf("\n");
    }
}

int main(void)
{   
    print_table();
    return 0;
}
```

测试一下：

```bash
xi@tanxi:~/Compiler/jlox$ gcc test.c && ./a.out && rm a.out
1
2       4
3       6       9
4       8       12      16
5       10      15      20      25
6       12      18      24      30      36
7       14      21      28      35      42      49
8       16      24      32      40      48      56      64
9       18      27      36      45      54      63      72      81
```

> 练习：编写函数`diamond`打印一个菱形。
> 

```c
#include <stdio.h>

void print_table(int n, char c) {
		// 打印上半部分
    for (int i = 0; i < n / 2; i++) {
        for (int j = 0; j < n / 2 - i; j++) {
            printf(" ");
        }
        for (int k = 0; k < 2 * i + 1; k++) {
            printf("%c", c);
        }
        printf("\n");
    } 
		
		// 打印下半部分
    for (int i = n / 2; i >= 0; i--) {
        for (int j = 0; j < n/2 - i; j++) {
            printf(" ");
        }
        for (int k = 0; k < 2 * i + 1; k++) {
            printf("%c", c);
        }
        printf("\n");
    }
}

int main(void)
{   
    int n;
    char c;
    scanf("%d %c", &n, &c);
    print_table(n, c);
    return 0;
}
```

```bash
xi@tanxi:~/Compiler/jlox$ gcc test.c && ./a.out && rm a.out
20 @
          @
         @@@
        @@@@@
       @@@@@@@
      @@@@@@@@@
     @@@@@@@@@@@
    @@@@@@@@@@@@@
   @@@@@@@@@@@@@@@
  @@@@@@@@@@@@@@@@@
 @@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@
 @@@@@@@@@@@@@@@@@@@
  @@@@@@@@@@@@@@@@@
   @@@@@@@@@@@@@@@
    @@@@@@@@@@@@@
     @@@@@@@@@@@
      @@@@@@@@@
       @@@@@@@
        @@@@@
         @@@
          @
```

> **滥用`goto`语句会使程序的控制流程非常复杂，可读性很差**。著名的计算机科学家Edsger W. Dijkstra最早指出编程语言中`goto`语句的危害，提倡取消`goto`语句。`goto`语句不是必须存在的
> 

## 7. **结构体**

[[SICP]](https://akaedu.github.io/book/bi01.html#bibli.sicp)指出，在学习一门编程语言时要特别注意以下三个方面：

1. **这门语言提供了哪些Primitive**，比如基本类型，比如基本运算符、表达式和语句。
2. **这门语言提供了哪些组合规则**，比如基本类型如何组成复合类型，比如简单的表达式和语句如何组成复杂的表达式和语句。
3. **这门语言提供了哪些抽象机制**，包括**数据抽象**和**过程抽象**（Procedure Abstraction）。

抽象：以复数表示为例

```c
#include <math.h>

// 定义数据抽象
struct complex_struct {
	double x, y;
};

// 下面4个函数位于抽象的最底层，能直接访问complex_struct中的数据
double real_part(struct complex_struct z)
{
	return z.x;
}

double img_part(struct complex_struct z)
{
	return z.y;
}

double magnitude(struct complex_struct z)
{
	return sqrt(z.x * z.x + z.y * z.y);
}

double angle(struct complex_struct z)
{
	return atan2(z.y, z.x);
}
 
// 构造complex
struct complex_struct make_from_real_img(double x, double y)
{
	struct complex_struct z;
	z.x = x;
	z.y = y;
	return z;
}

struct complex_struct make_from_mag_ang(double r, double A)
{
	struct complex_struct z;
	z.x = r * cos(A);
	z.y = r * sin(A);
	return z;
}

// 抽象层次开始提高，在下面3个函数中不再
// 复数加法
struct complex_struct add_complex(struct complex_struct z1, struct complex_struct z2)
{
	return make_from_real_img(real_part(z1) + real_part(z2),
				  img_part(z1) + img_part(z2));
}

// 复数减法
struct complex_struct sub_complex(struct complex_struct z1, struct complex_struct z2)
{
	return make_from_real_img(real_part(z1) - real_part(z2),
				  img_part(z1) - img_part(z2));
}

// 复数乘法
struct complex_struct mul_complex(struct complex_struct z1, struct complex_struct z2)
{
	return make_from_mag_ang(magnitude(z1) * magnitude(z2),
				 angle(z1) + angle(z2));
}

// 复数除法
struct complex_struct div_complex(struct complex_struct z1, struct complex_struct z2)
{
	return make_from_mag_ang(magnitude(z1) / magnitude(z2),
				 angle(z1) - angle(z2));
}
```

这里的复数**存储表示层**和复数**运算层**被划分为两个**抽象层（Abstraction Layer）**，从底层往上层来看，复数越来越抽象了，把所有这些层组合在一起就是一个完整的系统。**组合使得系统可以任意复杂，而抽象使得系统的复杂性是可以控制的，任何改动都只局限在某一层，而不会波及整个系统**。著名的计算机科学家Butler Lampson说过：“All problems in computer science can be solved by another level of indirection.”这里的**indirection**其实就是**abstraction**的意思。

> 练习：在本节的基础上实现一个打印复数的函数，打印的格式是x+yi，如果实部或虚部为0则省略，例如：1.0、-2.0i、-1.0+2.0i、1.0-2.0i。最后编写一个`main`函数测试本节的所有代码。想一想这个打印函数应该属于上图中的哪一层？
> 

```c
void print_complex(struct complex_struct z) {
    printf("%lf", real_part(z));
    if (img_part(z) < 0) {
        printf("%lf\n", img_part(z));
    } else {
        printf("+%lf\n", img_part(z));
    }
}

int main() {
    struct complex_struct z1 = make_from_real_img(1, -5);
    struct complex_struct z2 = make_from_real_img(3, 2);

    print_complex(z1);
    print_complex(z2);

    return 0;
}
```

> 实现一个用分子分母的格式来表示有理数的结构体`rational`以及相关的函数，`rational`结构体之间可以做加减乘除运算，运算的结果仍然是`rational`。
> 

```c
#include <stdio.h>
#include <math.h>

int gcd(int a, int b) {
    if (a % b == 0) {
        return b;
    }

    return gcd(b, a % b);
}
 
// 底层结构体
struct rational {
    int norm;
    int denorm;
};

// 最底层的函数，直接访问结构体的成员
int norm(struct rational r) {
    return r.norm;
}

int denorm(struct rational r) {
    return r.denorm;
}

// 编写构造器
struct rational make_rational(int p, int q) {
    struct rational r;
    r.norm = p;
    r.denorm = q;
    return r;
}

// 第二层函数：在norm、denorm和make_rational的抽象上工作
struct rational add_rational(struct rational a, struct rational b) {
    int n = norm(a) * denorm(b) + norm(b) * denorm(a);
    int d = denorm(a) * denorm(b);
    
    int common = gcd(n, d);
    return make_rational(n / common, d / common);
}

struct rational sub_rational(struct rational a, struct rational b) {
    int n = norm(a) * denorm(b) - norm(b) * denorm(a);
    int d = denorm(a) * denorm(b);
    
    int common = gcd(n, d);
    return make_rational(n / common, d / common);
}

struct rational mul_rational(struct rational a, struct rational b) {
    int n = norm(a) * norm(b);
    int d = denorm(a) * denorm(b);
    
    int common = gcd(n, d);
    return make_rational(n / common, d / common);
}

struct rational div_rational(struct rational a, struct rational b) {
    int n = norm(a) * denorm(b);
    int d = denorm(a) * norm(b);
    
    int common = gcd(n, d);
    return make_rational(n / common, d / common);
}

void print_rational(struct rational r) {
    printf("rational: %d / %d\n", norm(r), denorm(r));
}

int main(void)
{
	struct rational a = make_rational(1, 8); /* a=1/8 */
	struct rational b = make_rational(-1, 8); /* b=-1/8 */
	print_rational(add_rational(a, b));
	print_rational(sub_rational(a, b));
	print_rational(mul_rational(a, b));
	print_rational(div_rational(a, b));

	return 0;
}
```

测试一下：

```bash
xi@tanxi:~/Compiler/jlox$ gcc test.c -lm && ./a.out && rm a.out
rational: 0 / 1
rational: 1 / 4
rational: 1 / -64
rational: -1 / 1
```

## 8. **数组**

> **未定义行为（UB）**：C编译器并不检查`count[-1]`或是`count[100]`这样的访问越界错误，编译时能顺利通过，所以属于运行时错误。所以使用数组下标一定不能超出数组的长度范围。
> 

**关键问题：为什么编译器不检查？**

因为很多时候指针访问必须在运行时才知道要访问的目的地，并且如果每次都检查越界反而会导致性能下降。因此C语言的设计精神是：相信每个C程序员都是高手，不要阻止程序员去干他们需要干的事，高手们使用`count[-1]`这种技巧其实并不少见，不应该当作错误。

> 练习：编写一个程序，定义两个类型和长度都相同的数组，将其中一个数组的所有元素拷贝给另一个。既然数组不能直接赋值，想想应该怎么实现。
> 

在下面的实现中，我们将数组名作为参数传递给函数copy，**这里的数组类型做右值使用时，自动转换成指向数组首元素的指针**。

```c
#include <stdio.h>

void copy(int* dst, int* src, int n) {
	for (int i = 0; i < n; i++) {
		dst[i] = src[i];
	}
}

int main() {
	int a[] = {1, 2, 3, 4, 5};
	int b[] = {4, 4, 4, 4, 4};

	int n = 5;
	for (int i = 0; i < 5; i++) {
		printf("%d ", b[i]);
	}
	printf("\n");

	copy(b, a, n);
	for (int i = 0; i < 5; i++) {
		printf("%d ", b[i]);
	}
	printf("\n");

	return 0;
}
```

运行：

```bash
~/ ➜ ./a.out
4 4 4 4 4
1 2 3 4 5
```

C语言字符串：使用字符数组存储，并以字符’\0’作为结束符。

如果数组`str`中没有Null字符，那么`printf`函数就会访问数组越界，后果可能会很诡异：有时候打印出乱码，有时候看起来没错误，有时候引起程序崩溃。

## 9. **编码风格**

> “Thus, programs must be written for people to read, and only incidentally for machines to execute.”
> 

代码主要是为了写给人看的，而不是写给机器看的，只是顺便也能用机器执行而已。

**代码风格好不好就像字写得好不好看一样，代码风格糟糕的程序员肯定也是不称职的**。虽然编译器不会挑剔难看的代码，照样能编译通过，但是和你一个Team的其他程序员肯定受不了，你自己也受不了，写完代码几天之后再来看，自己都不知道自己写的是什么。

这部分可以看我的博客：[Linux内核代码风格：官方规范与实践指南](https://jiangmmh.github.io/posts/linux-style/)。

**注释的使用：**

- **整个源文件的顶部注释**。说明此模块的相关信息，例如文件名、作者和版本历史等，顶头写不缩进
- **函数注释**。说明此函数的功能、参数、返回值、错误码等，写在函数定义上侧，和此函数定义之间不留空行，顶头写不缩进。
- **相对独立的语句组注释**。对这一组语句做特别说明，写在语句组上侧，和此语句组之间不留空行，与当前语句组的缩进一致。
- **代码行右侧的简短注释**。对当前代码行做特别说明，一般为单行注释，和代码之间至少用一个空格隔开，一个源文件中所有的右侧注释最好能上下对齐。
- **复杂的结构体定义比函数更需要注释**。
- **复杂的宏定义和变量声明也需要注释。**

> **函数内的注释要尽可能少用**。写注释主要是为了说明你的代码**“能做什么”**（比如函数接口定义），而不是为了说明**“怎样做”**，**只要代码写得足够清晰，“怎样做”是一目了然的**，如果你需要用注释才能解释清楚，那就表示你的代码可读性很差，除非是特别需要提醒注意的地方才使用函数内注释。
> 

**标识符命名原则：**

- **标识符命名要清晰明了**，可以使用完整的单词和易于理解的缩写。
- 内核编码风格规定**变量、函数和类型**采用**全小写加下划线**的方式命名，**常量**（比如宏定义和枚举常量）采用**全大写加下划线**的方式命名。
- **全局变量和全局函数的命名一定要详细**，不惜多用几个单词多写几个下划线。

**函数的设计：每个函数都应该设计得尽可能简单，简单的函数才容易维护。**

- **实现一个函数只是为了做好一件事情**。
- **函数内部的缩进层次不宜过多**，一般以少于4层为宜。
- **函数不要写得太长**，建议在24行的标准终端上不超过两屏，太长会造成阅读困难，如果一个函数超过两屏就应该考虑分割函数了。
- **执行函数就是执行一个动作**，函数名通常应包含动词，如get_current、radix_tree_insert。
- **比较重要的函数定义上侧必须加注释**，说明此函数的功能、参数、返回值、错误码等
- **另一种度量函数复杂度的办法是看有多少个局部变量**，5到10个局部变量已经很多了，再多就很难维护了，应该考虑分割成多个函数。

## 10. GDB

调试方法：

1. printf大法，在代码适当位置插入printf，打印出结果，检查其是否符合预期。
2. 使用调试工具`gdb` ，可以完全操控程序的运行。

GDB的使用方法：

- 在编译时加上选项 -g，在可执行程序中添加调试信息
- 使用命令 gdb a.out 启动gdb，并打开程序

GDB命令：

![image.png](/images/posts/ysyx-e2/image.png)

![image.png](/images/posts/ysyx-e2/image%201.png)

> 习题：首先用字符串`"hello"`初始化一个字符数组`str`（算上`'\0'`共6个字符）。然后用空字符串`""`初始化一个同样长的字符数组`reverse_str`，相当于所有元素用`'\0'`初始化。然后打印`str`，把`str`倒序存入`reverse_str`，再打印`reverse_str`。然而结果并不正确。
> 

```c
#include <stdio.h>

int main(void)
{
	int i;
	char str[6] = "hello";
	char reverse_str[6] = "";
	
	printf("%s\n", str);
	for (i = 0; i < 5; i++)
		reverse_str[5-i] = str[i];
	printf("%s\n", reverse_str);
	return 0;
}
```

这个问题在于reverse_str在下标5处的字符是’\0’，上述操作会将结束符拷贝到reverse_str的第一个字符，这就是为什么最后的printf没有输出任何字符到终端。

---

GDB 的 **watchpoint（观察点）** 是一种**在变量值发生变化时自动暂停程序**的断点。而普通的断点是执行到某条指令时停下。

![image.png](/images/posts/ysyx-e2/image%202.png)

## 11. **排序与查找**

> 算法（Algorithm）是将一组输入转化成一组输出的一系列计算步骤，其中每个步骤必须能在有限时间内完成。
> 

算法一般是一个通用的解决方案，其适用于一类问题，而不仅仅是对特定问题的解。

**排序算法示例：插入排序**

- 时间复杂度为O(n^2)
- 空间复杂度为O(1)

```cpp
class Solution {
public:
    vector<int> sortArray(vector<int>& nums) {
        // insertion sort
        for (int i = 1; i < nums.size(); i++) {
            int j = i - 1;
            int x = nums[i];
						
            while (j >= 0 && nums[j] > x) {
                nums[j+1] = nums[j];
                j--;
            }

            nums[j+1] = x;
        }

        return nums;
    }
};
```

**另一种排序算法：归并排序**

- 时间复杂度为O(nlogn)
- 空间复杂度为O(n)

```cpp
class Solution {
    void mergeSort(vector<int>& nums, int l, int r) {
        if (l >= r) return ;
			
        vector<int> tmp(r-l+1);      // 临时数组
       
        int mid = l + (r - l) / 2;
        mergeSort(nums, l, mid);     // 对左半部分排序
        mergeSort(nums, mid+1, r);   // 对右半部分排序

        int i = l, j = mid+1, k = 0; // 合并有序数组
        while (i <= mid && j <= r) {
            if (nums[i] < nums[j]) {
                tmp[k++] = nums[i++];
            } else {
                tmp[k++] = nums[j++];
            }
        }

        while (i <= mid) {
            tmp[k++] = nums[i++];
        }
        while (j <= r) {
            tmp[k++] = nums[j++];
        }

        k = 0;
        for (i = l; i <= r; i++) {  
            nums[i] = tmp[k++];
        }
    }
public:
    vector<int> sortArray(vector<int>& nums) {
        mergeSort(nums, 0, nums.size() - 1);
        return nums;
    }
};
```

> 练习：写一个快排程序。
> 

```c
void quick_sort(int arr[], int l, int r) {
    if (l >= r) return ;

    int i = l - 1, j = r + 1;
    int x = arr[l + (r - l) / 2];

    while (i < j) {
        while (arr[++i] < x);
        while (arr[--j] > x);
        if (i < j) {
            int t = arr[i];
            arr[i] = arr[j];
            arr[j] = t;
        }
    }
    
    quick_sort(arr, l, j);
    quick_sort(arr, j+1, r);
}
```

最好时间复杂度为O(nlogn)，最坏时间复杂度为O(n^2)

---

**线性搜索**：时间复杂度为O(n)。

```c
#include <stdio.h>

char a[]="hello world";

int indexof(char letter)
{
	int i = 0;
	while (a[i] != '\0') {
		if (a[i] == letter)
			return i;
		i++;
	}
	return -1;
}

int main(void)
{
	printf("%d %d\n", indexof('o'), indexof('z'));
	return 0;
}
```

> 练习：实现一个算法，在一组随机排列的数中找出最小的一个。你能想到的最直观的算法一定是Θ(n)的，想想有没有比Θ(n)更快的算法？
> 

遍历数组，用一个变量记录最小元素即可。不可能存在复杂度小于O(n)的算法。

> 练习：在一组随机排列的数中找出第二小的，这个问题比上一个稍复杂，你能不能想出Θ(n)的算法？
> 

可以在遍历过程中使用两个变量记录最小和次小的元素，或者使用哈希表。

> 练习：在一组随机排列的数中找出第k小的元素，即TopK问题。
> 

可使用堆实现，也可以使用快速选择算法实现，即在快速排序的过程中找第k大的元素。

---

**折半查找（二分查找）**

该算法的前提：数组a是有序的

```c
#include <stdio.h>

#define LEN 8
int a[LEN] = { 1, 2, 2, 2, 5, 6, 8, 9 };

int binarysearch(int number)
{
	int mid, l = 0, r = LEN - 1;

	while (start <= end) {
		mid = l + (r - l) / 2;
		if (a[mid] < number)
			l = mid + 1;
		else if (a[mid] > number)
			r = mid - 1;
		else
			return mid;
	}
	return -1;
}

int main(void)
{
	printf("%d\n", binarysearch(5));
	return 0;
}
```

> 练习：编写一个函数`double mysqrt(double y);`求`y`的正平方根，参数`y`是正实数。我们用折半查找来找这个平方根，在从0到`y`之间必定有一个取值是`y`的平方根，如果我们查找的数`x`比`y`的平方根小，则x2<y，如果我们查找的数`x`比`y`的平方根大，则x2>y，我们可以据此缩小查找范围，当我们查找的数足够准确时（比如满足|x2-y|<0.001），就可以认为找到了`y`的平方根。思考一下这个算法需要迭代多少次？迭代次数的多少由什么因素决定？
> 

Leetecode题目：[LCR 072. x 的平方根](https://leetcode.cn/problems/jJ0w9p/)

```cpp
class Solution {
public:
    int mySqrt(int x) {
        int l = 1, r = x;
        while (l <= r) {
            int mid = l + (r - l) / 2;
            if (mid <= x / mid) {
                // 处理超过的部分
                if (mid + 1 > x / (mid + 1)) {
                    return mid;
                }
                l = mid + 1;
            } else {
                r = mid - 1;
            }
        }

        return 0;
    }
};
```

## 12. **栈与队列**

> 数据结构（Data Structure）是数据的组织方式。
> 

**程序 = 算法+数据结构**

```c
int maze[5][5] = {
	0, 1, 0, 0, 0,
	0, 1, 0, 1, 0,
	0, 0, 0, 0, 0,
	0, 1, 1, 1, 0,
	0, 0, 0, 1, 0,
};
```

这表示一个迷宫，其中的1表示墙壁，0表示可以走的路，只能横着走或竖着走，不能斜着走，要求编程序找出从左上角到右下角的路线。

使用深度优先搜索（DFS）解决：

```cpp
#include <stdio.h>

#define MAX_ROW 5
#define MAX_COL 5

struct point { int row, col; } stack[512];
int top = 0;

void push(struct point p)
{
	stack[top++] = p;
}

struct point pop(void)
{
	return stack[--top];
}

int is_empty(void)
{
	return top == 0;
}

int maze[MAX_ROW][MAX_COL] = {
	0, 1, 0, 0, 0,
	0, 1, 0, 1, 0,
	0, 0, 0, 0, 0,
	0, 1, 1, 1, 0,
	0, 0, 0, 1, 0,
};

void print_maze(void)
{
	int i, j;
	for (i = 0; i < MAX_ROW; i++) {
		for (j = 0; j < MAX_COL; j++)
			printf("%d ", maze[i][j]);
		putchar('\n');
	}
	printf("*********\n");
}

struct point predecessor[MAX_ROW][MAX_COL] = {
	{{-1,-1}, {-1,-1}, {-1,-1}, {-1,-1}, {-1,-1}},
	{{-1,-1}, {-1,-1}, {-1,-1}, {-1,-1}, {-1,-1}},
	{{-1,-1}, {-1,-1}, {-1,-1}, {-1,-1}, {-1,-1}},
	{{-1,-1}, {-1,-1}, {-1,-1}, {-1,-1}, {-1,-1}},
	{{-1,-1}, {-1,-1}, {-1,-1}, {-1,-1}, {-1,-1}},
};

void visit(int row, int col, struct point pre)
{
	struct point visit_point = { row, col };
	maze[row][col] = 2;
	predecessor[row][col] = pre;
	push(visit_point);
}

int main(void)
{
	struct point p = { 0, 0 };

	maze[p.row][p.col] = 2;
	push(p);

	while (!is_empty()) {
		p = pop();
		if (p.row == MAX_ROW - 1  /* goal */
		    && p.col == MAX_COL - 1)
			break;
		if (p.col+1 < MAX_COL     /* right */
		    && maze[p.row][p.col+1] == 0)
			visit(p.row, p.col+1, p);
		if (p.row+1 < MAX_ROW     /* down */
		    && maze[p.row+1][p.col] == 0)
			visit(p.row+1, p.col, p);
		if (p.col-1 >= 0          /* left */
		    && maze[p.row][p.col-1] == 0)
			visit(p.row, p.col-1, p);
		if (p.row-1 >= 0          /* up */
		    && maze[p.row-1][p.col] == 0)
			visit(p.row-1, p.col, p);
		print_maze();
	}
	if (p.row == MAX_ROW - 1 && p.col == MAX_COL - 1) {
		printf("(%d, %d)\n", p.row, p.col);
		while (predecessor[p.row][p.col].row != -1) {
			p = predecessor[p.row][p.col];
			printf("(%d, %d)\n", p.row, p.col);
		}
	} else
		printf("No path!\n");

	return 0;
}
```

使用广度优先搜索（BFS）解决：

```c
#include <stdio.h>

#define MAX_ROW 5
#define MAX_COL 5

struct point { int row, col, predecessor; } queue[512];
int head = 0, tail = 0;

void enqueue(struct point p)
{
	queue[tail++] = p;
}

struct point dequeue(void)
{
	return queue[head++];
}

int is_empty(void)
{
	return head == tail;
}

int maze[MAX_ROW][MAX_COL] = {
	0, 1, 0, 0, 0,
	0, 1, 0, 1, 0,
	0, 0, 0, 0, 0,
	0, 1, 1, 1, 0,
	0, 0, 0, 1, 0,
};

void print_maze(void)
{
	int i, j;
	for (i = 0; i < MAX_ROW; i++) {
		for (j = 0; j < MAX_COL; j++)
			printf("%d ", maze[i][j]);
		putchar('\n');
	}
	printf("*********\n");
}

void visit(int row, int col)
{
	struct point visit_point = { row, col, head-1 };
	maze[row][col] = 2;
	enqueue(visit_point);
}

int main(void)
{
	struct point p = { 0, 0, -1 };

	maze[p.row][p.col] = 2;
	enqueue(p);
	
	while (!is_empty()) {
		p = dequeue();
		if (p.row == MAX_ROW - 1  /* goal */
		    && p.col == MAX_COL - 1)
			break;
		if (p.col+1 < MAX_COL     /* right */
		    && maze[p.row][p.col+1] == 0)
			visit(p.row, p.col+1);
		if (p.row+1 < MAX_ROW     /* down */
		    && maze[p.row+1][p.col] == 0)
			visit(p.row+1, p.col);
		if (p.col-1 >= 0          /* left */
		    && maze[p.row][p.col-1] == 0)
			visit(p.row, p.col-1);
		if (p.row-1 >= 0          /* up */
		    && maze[p.row-1][p.col] == 0)
			visit(p.row-1, p.col);
		print_maze();
	}
	if (p.row == MAX_ROW - 1 && p.col == MAX_COL - 1) {
		printf("(%d, %d)\n", p.row, p.col);
		while (p.predecessor != -1) {
			p = queue[p.predecessor];
			printf("(%d, %d)\n", p.row, p.col);
		}
	} else
		printf("No path!\n");

	return 0;
}
```

## 13. **本阶段总结**

**善于学习的人都应该善于总结**。本书的编排顺序充分考虑到知识的前后依赖关系，保证在讲解每个新知识点的时候都只用到前面章节讲过的知识，但正因为如此，很多相互关联的知识点被拆散到多个章节中了。我们一章一章地纵向学习过来之后，应该理出几个横切面，把拆散到各章节中的知识点串起来。请从以下几个方面整理和复习。

1、**C的语法规则**。

- 源文件中所有函数定义之外可以出现哪些语法元素？
- 函数定义之中可以出现哪些语法元素？
- 语句有哪几种？
- 哪些语法元素需要遵循标识符的命名规则？
- 表达式由哪些语法元素组成？
- 到目前为止学过哪些运算符？它们的优先级和结合性是怎样的？
- 哪些运算符取操作数的左值？哪些运算符的操作数必须是整型？哪些运算符有Side Effect？
- 哪些表达式可以做左值？哪些表达式只能做右值？
- 哪些地方必须用常量表达式？哪些地方必须用整数常量表达式？

2、**思维方法与编程思想**。

- 以概念为中心，[第 1 节 “程序和编程语言”](https://akaedu.github.io/book/intro.program.html)
- 组合规则，[第 5 节 “表达式”](https://akaedu.github.io/book/expr.expression.html)
- Least Surprise，[第 3 节 “形参和实参”](https://akaedu.github.io/book/ch03s03.html#func.paraarg)
- 充分条件与必要条件，[第 4 节 “全局变量、局部变量和作用域”](https://akaedu.github.io/book/ch03s04.html#func.localvar)
- 封装，[第 2 节 “if/else语句”](https://akaedu.github.io/book/ch04s02.html#cond.ifelse)
- 布尔逻辑，[第 3 节 “布尔代数”](https://akaedu.github.io/book/ch04s03.html#cond.bool)
- 递归，[第 3 节 “递归”](https://akaedu.github.io/book/ch05s03.html#func2.recursion)
- 函数式编程，[第 1 节 “while语句”](https://akaedu.github.io/book/ch06s01.html#iter.while)
- 迭代（[第 6 章 *循环语句*](https://akaedu.github.io/book/ch06.html#iter)）与增量式求解（[第 2 节 “插入排序”](https://akaedu.github.io/book/ch11s02.html#sortsearch.insertion)）
- 抽象，[第 2 节 “数据抽象”](https://akaedu.github.io/book/ch07s02.html#struct.abstract)
- 数据驱动，[第 5 节 “多维数组”](https://akaedu.github.io/book/ch08s05.html#array.multidimension)
- 分而治之，[第 4 节 “归并排序”](https://akaedu.github.io/book/ch11s04.html#sortsearch.merge)
- 折半查找，[第 6 节 “折半查找”](https://akaedu.github.io/book/ch11s06.html#sortsearch.binary)
- 回溯，[例 12.3 “用深度优先搜索解迷宫问题”](https://akaedu.github.io/book/ch12s03.html#stackqueue.dfs)

3、调试方法

- 编译错误、运行时错误与语义错误，[第 3 节 “程序的调试”](https://akaedu.github.io/book/ch01s03.html#intro.debug)
- 增量式开发，[第 2 节 “增量式开发”](https://akaedu.github.io/book/ch05s02.html#func2.incremental)
- 打印语句与Scaffold，[第 2 节 “增量式开发”](https://akaedu.github.io/book/ch05s02.html#func2.incremental)
- gdb，[第 10 章 *gdb*](https://akaedu.github.io/book/ch10.html#gdb)
- DbC与Assertion，[第 6 节 “折半查找”](https://akaedu.github.io/book/ch11s06.html#sortsearch.binary)

## 14. **计算机中数的表示**

**整数的表示方法：多种表示法**

- Sign and Magnitude表示法（原码）
- 1's Complement表示法（反码）
- 2's Complement表示法（补码）
    - 溢出检查方法：最高进位和次高进位做异或

**浮点数：IEEE 754标准**

- 规格化数，移码为1～254
    - 尾数为1.M
- 非规格化数，移码为0
    - 尾数为0.M

> 由于浮点数表示的精度有限，计算结果末尾的10两位被舍去了。做浮点运算时要注意精度损失（Significance Loss）问题，有时计算顺序不同也会导致不同的结果。
> 

## 15. **数据类型详解**

> 
> 
> 
> 在C标准中没有做明确规定的地方会用Implementation-defined、Unspecified或Undefined来表述，在本书中有时把这三种情况统称为“未明确定义”的。这三种情况到底有什么不同呢？
> 
> - **Implementation-defined**的情况：C标准没有明确规定`char`是有符号的还是无符号的，但是要求编译器必须对此做出明确规定，并写在编译器的文档中。
> - **Unspecified**的情况：往往有几种可选的处理方式，C标准没有明确规定按哪种方式处理，编译器可以自己决定，并且也不必写在编译器的文档中，这样即便用同一个编译器的不同版本来编译也可能得到不同的结果，因为编译器没有在文档中明确写它会怎么处理，那么不同版本的编译器就可以选择不同的处理方式，比如下一章我们会讲到一个函数调用的各个实参表达式按什么顺序求值是Unspecified的。
> - **Undefined**的情况：完全不确定的，C标准没规定怎么处理，编译器很可能也没规定，甚至也没做出错处理，有很多Undefined的情况编译器是检查不出来的，最终会导致运行时错误，比如数组访问越界就是Undefined的。

## 16. **运算符详解**

略

## 17. **计算机体系结构基础**

从CPU的角度来看，访问设备只有内存映射I/O和端口I/O两种：

- 内存映射I/O（Memory-mapped I/O），通过访问特定物理地址来访问I/O设备
- 端口I/O（Port I/O），例如x86通过特殊的`in`/`out`指令

但实际上，访问设备是相当复杂的，计算机的设备五花八门，各种设备的性能要求都不一样，有的要求带宽大，有的要求响应快，有的要求热插拔，于是出现了各种适应不同要求的设备总线，比如PCI、AGP、USB、1394、SATA等等。

这些设备总线并不直接和CPU相连，**CPU通过内存映射I/O或端口I/O访问相应的总线控制器，通过总线控制器再去访问挂在总线上的设备**。

**访问设备还有一点和访问内存不同：**

- **内存总是被动地等待被读或者被写，**因为内存只是保存数据而不会产生新的数据，如果CPU不去读它，它也不需要主动提供数据给CPU。
- 设备往往会自己产生数据，并且需要主动通知CPU来读这些数据。

**CPU等待设备数据的方法**：

- 轮询
- 中断
- DMA

---

现代操作系统普遍采用**虚拟内存管理（Virtual Memory Management）**机制，这需要处理器中的**MMU（Memory Management Unit，内存管理单元）**提供支持

通过内核提供的虚拟内存管理，每个进程都拥有自己独立的地址空间，但实际上其看到的是虚拟地址，在访问某个地址时，会先通过MMU将虚拟地址转换为物理地址，然后再进行访问。

这样就实现了：

- 进程之间的内存隔离，因为如何进行地址转换又内核控制
- 权限保护，每个页面的页表项（PTE）都有访问权限，某些页面只有在特权模式下才能访问

---

内存层次结构：

![image.png](/images/posts/ysyx-e2/image%203.png)

## 18. **x86汇编程序基础**

下面是一个简单的x86汇编程序：

```nasm
#PURPOSE: Simple program that exits and returns a
#	  status code back to the Linux kernel
#
#INPUT:   none
#
#OUTPUT:  returns a status code. This can be viewed
#	  by typing
#
#	  echo $?
#
#	  after running the program
#
#VARIABLES:
#	  %eax holds the system call number
#	  %ebx holds the return status
#
 .section .data

 .section .text
 .globl _start
_start:
 movl $1, %eax	# this is the linux kernel command
		# number (system call) for exiting
		# a program

 movl $4, %ebx	# this is the status number we will
		# return to the operating system.
		# Change this around and it will
		# return different things to
		# echo $?

 int $0x80	# this wakes up the kernel to run
		# the exit command
```

- . 开头的都是伪指令，由汇编器处理
    - .section xxx 表示下面的内容存放到哪个段（段后面会解释）
    - .global xxx 表示后面的名字是一个全局标识符
- _start: 是一个标签，在汇编后变成偏移
- movl和int是x86的指令
    - int指令称为软中断指令，可以用这条指令故意产生一个异常，上一章讲过，异常的处理和中断类似，CPU从用户模式切换到特权模式，然后跳转到内核代码中执行异常处理程序

汇编 + 链接 → 得到可执行程序：

```bash
$ as hello.s -o hello.o
$ ld hello.o -o hello
$ ./hello
$ echo $?
4
```

为什么用汇编器翻译成机器指令了还不行，还要有一个链接的步骤呢？链接主要有两个作用：

- 一是修改目标文件中的信息，对地址做重定位。
- 二是把多个目标文件合并成一个可执行文件。

---

x86的通用寄存器如下（图片摘自CSAPP）：

![image.png](/images/posts/ysyx-e2/image%204.png)

x86的特殊寄存器有`ebp`、`esp`、`eip`、`eflags`。`eip`是程序计数器，`eflags`保存着计算过程中产生的标志位，其中包括进位标志、溢出标志、零标志和负数标志，在intel的手册中这几个标志位分别称为CF、OF、ZF、SF。`ebp`和`esp`用于维护函数调用的栈帧。

操作数寻址方式如下：

![image.png](/images/posts/ysyx-e2/image%205.png)

---

**ELF文件**：**ELF文件格式是一个开放标准**，各种UNIX系统的可执行文件都采用ELF格式，它有三种不同的类型：

- 可重定位的目标文件（Relocatable，或者Object File）
- 可执行文件（Executable）
- 共享库（Shared Object，或者Shared Library）

**现在详细解释一下这个程序的汇编、链接、运行过程：**

1. 写一个汇编程序保存成文本文件`max.s`。
2. 汇编器读取这个文本文件转换成目标文件`max.o`，
    1. 目标文件由**若干个Section**组成
    2. 我们在汇编程序中声明的`.section`会成为目标文件中的Section
    3. 此外汇编器还会自动添加一些Section（比如**符号表**）。
3. 然后链接器**把目标文件中的Section合并成几个Segment**，生成可执行文件`max`。
4. 加载器（Loader）根据可执行文件中的Segment信息加载运行这个程序

**ELF格式提供了两种不同的视角：**

- 链接器把ELF文件看成是Section的集合
- 加载器把ELF文件看成是Segment的集合

![image.png](/images/posts/ysyx-e2/image%206.png)

- 开头的ELF Header描述了体系结构和操作系统等基本信息，并指出Section Header Table和Program Header Table在文件中的位置
- Section Header Table中保存了当前文件全部Section的描述信息，通过Section Header Table可以找到每个Section在文件中的位置
    - Program Header Table在链接过程中用不到，所以是可有可无的
- Program Header Table中保存了所有Segment的描述信息
    - Section Header Table在加载过程中用不到，所以是可有可无的

> **一个Segment由一个或多个Section组成，这些Section加载到内存时具有相同的访问权限。**
> 

介绍下ELF中的段：

- **`.text`**：存放**可执行的机器指令**，即程序的代码。该段在进程执行期间通常是只读的，以防止程序意外修改指令。
- **`.data`**：存放**已初始化的全局变量和静态变量**。这些数据在程序加载时从文件读入内存，并且可读可写。
- **`.bss`**：存放**未初始化的全局变量和静态变量**。**为了节省磁盘空间**，`.bss` 段在 ELF 文件中**不占用实际空间**（只有段头表项），但在程序加载时，系统会为其在内存中分配空间并清零。
- **`.symtab`**：**符号表**，包含程序中定义和引用的函数、变量等符号的信息。它通常用于静态链接，在最终的可执行文件中可能被剥离以减小体积。
- **`.dynsym`**：**动态符号表**，是 `.symtab` 的子集，专门供动态链接器在运行时解析外部符号使用。
- **`.rel.*` / `.rela.*`**：**重定位段**。在链接或加载时，用于修正代码或数据中对符号地址的引用（例如，将函数调用地址指向正确的内存位置）。`.rela` 类型包含显式的加数（addend），而 `.rel` 类型则没有。
- **`.dynamic`**：存放**动态链接信息**。当程序依赖共享库时，动态链接器会读取此段，找到所需的库、符号表位置等。
- **`.init` / `.fini`**：分别存放程序**初始化**（在 `main` 之前执行）和**终结**（在 `main` 之后执行）的代码。
- **`.rodata`**：存放**只读数据**，如字符串常量、`const` 修饰的变量等。
- **`.debug`**：存放**调试信息**，供 GDB 等调试器使用，通常在发布版本中会被剥离。
- **`.comment`**：存放**编译器版本信息**等注释内容。

## 19. **汇编与C之间的关系**

`_start`的定义来自`/usr/lib/crt1.o` ，`crt1.o`的`_start`函数会调用`main`函数。如果我们用`gcc`做链接，`gcc`其实是调用`ld`将目标文件`crt1.o`和我们的`hello.o`链接在一起。

> **关键问题：为什么汇编程序的入口是`_start`，而C程序的入口是`main`函数呢？**
> 

当你在 shell 里执行 `./hello` 时，内核的 `execve` 系统调用会加载 ELF 文件，读取 ELF 头中的 `e_entry` 字段，然后把 CPU 的指令指针（PC）跳转到这个地址。**内核不知道、也不关心这个地址上是什么函数**——它只负责把控制权交出去。

如果链接器直接把 `e_entry` 指向你的 `main`，内核会直接跳到`main`函数，但是此时还未准备好`main`函数的执行环境。`main` 函数会期望 `argc`、`argv` 已经在寄存器/栈上就位，期望 C 运行时环境（堆、stdio、环境变量）已经初始化好，但内核交棒时并没有做这些事，所以需要一个中间层来做“用户态初始化”，这就是 `crt1.o` 里 `_start` 的职责。

**所以，_start做了什么工作？**`_start` 是 C 运行时（CRT, C Runtime）的入口，典型工作包括：

- **从内核提供的初始栈中取出 `argc`、`argv`、`envp`**。内核在 `execve` 时把这些放在新进程栈顶，`_start` 负责解析它们。
- **初始化运行时环境**：设置栈保护（`__stack_chk_guard`）、初始化 TLS（线程局部存储）、调用 `.init_array` 中的构造函数（C++ 全局对象构造、`__attribute__((constructor))` 函数等）。
- **调用 `__libc_start_main`**，后者进一步初始化 libc（堆管理、stdio、信号处理等），然后**才调用 `main`**。
- `main` 返回后，`__libc_start_main` 负责调用 `exit`，执行 `.fini_array` 中的析构函数、刷新 stdio 缓冲区、运行 `atexit` 注册的函数，最后通过 `exit_group` 系统调用真正结束进程。

**如果没有 `_start`，你的 `main` 返回后没有任何代码负责“正确退出进程”**——`ret` 会跳到一个未定义的地址，进程崩溃。

> **`_start` 是操作系统内核与用户程序之间的“交接点”，而我们的 `main`（或 `hello` 程序）本身并不具备直接作为进程入口的条件。**
> 

可以使用`objdump -d main` 来查看可执行文件反汇编的结果。

---

**作用域（Scope）**这个概念适用于所有标识符，而不仅仅是变量，C语言的作用域分为以下几类：

- **函数作用域（Function Scope）**，标识符在整个函数中都有效。只有语句标号属于函数作用域。标号在函数中不需要先声明后使用，在前面用一个`goto`语句也可以跳转到后面的某个标号，但仅限于同一个函数之中。
- **文件作用域（File Scope）**，标识符从它声明的位置开始直到这个程序文件[[30](https://akaedu.github.io/book/ch19s03.html#ftn.id2778429)]的末尾都有效。例如上例中`main`函数外面的`A`、`a`、`b`、`c`，还有`main`也算，`printf`其实是在`stdio.h`中声明的，被包含到这个程序文件中了，所以也算文件作用域的。
- **块作用域（Block Scope）**，标识符位于一对{}括号中（函数体或语句块），从它声明的位置开始到右}括号之间有效。例如上例中`main`函数里的`a`、`b`、`c`。此外，函数定义中的形参也算块作用域的，从声明的位置开始到函数末尾之间有效。
- **函数原型作用域（Function Prototype Scope）**，标识符出现在函数原型中，这个函数原型只是一个声明而不是定义（没有函数体），那么标识符从声明的位置开始到在这个原型末尾之间有效。例如`int foo(int a, int b);`中的`a`和`b`。

**标识符的链接属性（Linkage）**有三种：

- **External linkage（外部链接）**：不同翻译单元里的同名标识符指向同一个对象/函数，链接器会把它们合并。
- **Internal linkage（内部链接）**：标识符只在当前翻译单元内可见，链接器看不到它，不同文件里的同名 internal 符号互不干扰。
- **No linkage（无链接）**：标识符只在其所在作用域内有效，每次出现都是独立的实体（比如局部变量、函数参数）。

**存储类修饰符（Storage Class Specifier）**有以下几种关键字，可以修饰变量或函数声明：

- `static`，用它修饰的变量的存储空间是静态分配的，用它修饰的文件作用域的变量或函数具有Internal Linkage。
- `auto`，用它修饰的变量在函数调用时自动在栈上分配存储空间，函数返回时自动释放，例如上例中`main`函数里的`b`其实就是用`auto`修饰的，只不过`auto`可以省略不写，`auto`不能修饰文件作用域的变量。
- `register`，编译器对于用`register`修饰的变量会尽可能分配一个专门的寄存器来存储，但如果实在分配不开寄存器，编译器就把它当`auto`变量处理了，`register`不能修饰文件作用域的变量。现在一般编译器的优化都做得很好了，它自己会想办法有效地利用CPU的寄存器，所以现在`register`关键字也用得比较少了。
- `extern`，上面讲过，链接属性是根据一个标识符多次声明时是不是代表同一个变量或函数来分类的，`extern`关键字就用于多次声明同一个标识符，下一章再详细介绍它的用法。
- `typedef`，它并不是用来修饰变量的，而是定义一个类型名。在那一节也讲过，看`typedef`声明怎么看呢，首先去掉`typedef`把它看成变量声明，看这个变量是什么类型的，那么`typedef`就定义了一个什么类型，也就是说，`typedef`在语法结构中出现的位置和前面几个关键字一样，也是修饰变量声明的，所以从语法（而不是语义）的角度把它和前面几个关键字归类到一起。

**变量的生存期（Storage Duration，或者Lifetime）**分为以下几类：

- **静态生存期（Static Storage Duration）**，具有外部或内部链接属性，或者被`static`修饰的变量，在程序开始执行时分配和初始化一次，此后便一直存在直到程序结束。这种变量通常位于`.rodata`，`.data`或`.bss`段，例如上例中`main`函数外的`A`，`a`，`b`，`c`，以及`main`函数里的`a`。
- **自动生存期（Automatic Storage Duration）**，链接属性为无链接并且没有被`static`修饰的变量，这种变量在进入块作用域时在栈上或寄存器中分配，在退出块作用域时释放。例如上例中`main`函数里的`b`和`c`。
- **动态分配生存期（Allocated Storage Duration）**，以后会讲到调用`malloc`函数在进程的堆空间中分配内存，调用`free`函数可以释放这种存储空间。

---

**结构体和联合体：**

- 结构体中的成员会被编译器通过padding进行对齐
    - 一方面，大多数计算机体系统结构对于访问内存的指令是有限制的，例如在32位平台上，访问4字节的指令（比如上面的`movl`）所访问的内存地址应该是**4的整数倍**
    - 即使没有这个要求，如果不对齐也可能导致本该一次访存得到的数据，却要访存两次
- 一个联合体的各个成员占用相同的内存空间，联合体的长度等于其中最长成员的长度。

gcc提供了一种语法可以避免自动padding对齐：

```c
struct {
	char a;
	short b;
	int c;
	char d;
} __attribute__((packed)) s;
```

该语法将结构体成员如何排列的任务全权交给程序员。

> 练习：编写一个程序，测试运行它的平台是大端还是小端字节序。
> 

首先介绍下大端序和小端序：

- 大端序，低位地址存储高位字节
- 小端序，低位地址存储低位字节

```c
#include <stdio.h>

int is_big_endian() {
	int num = 0x11223344;
	char* ptr2num = (char*)&num;

	return *ptr2num == 0x11;
}

int main() {
	if (is_big_endian()) {
		printf("big endian!\n");
	} else {
		printf("little endian!\n");
	}

	return 0;
}
```

---

**内联汇编**。用C写程序比直接用汇编写程序更简洁，可读性更好，但效率可能不如汇编程序。

C语言简洁易读，容易组织规模较大的代码，而汇编效率高，而且写一些**特殊指令**必须用汇编。

`gcc`提供了一种扩展语法可以在C代码中使用内联汇编（Inline Assembly），其格式如下：

```nasm
__asm__(assembler template
	: output operands                  /* optional */
	: input operands                   /* optional */
	: list of clobbered registers      /* optional */
	);
```

下面这个程序将变量`a`的值赋给`b` ：

```c
#include <stdio.h>

int main() 
{
        int a = 10, b;

	__asm__("movl %1, %%eax\n\t"
		"movl %%eax, %0\n\t"
		:"=r"(b)        /* output */
		:"r"(a)         /* input */
		:"%eax"         /* clobbered register */
		);
	printf("Result: %d, %d\n", a, b);
	return 0;
}

```

---

`volatile` 是 C/C++ 中的一个**类型限定符**，它的核心作用是**告诉编译器：这个变量的值可能会在程序的控制流之外被改变，因此不要对它进行某些“自作聪明”的优化**。它并不解决多线程竞争，也不保证原子性，它的战场主要在底层硬件交互和特定场景下。

当变量被声明为 `volatile` 时，编译器必须**严格按照代码中写的次数和顺序**去访问内存，不能把值缓存到寄存器里反复使用，也不能删除“看起来没用”的读写。

## 20. **链接详解**

**extern和static关键字：**

- `extern`关键字表示这个标识符具有External Linkage
    - 不同翻译单元里的同名标识符指向同一个对象/函数，链接器会把它们合并。
- `static`关键字修饰一个函数声明和变量，则表示该标识符具有Internal Linkage
    - `static` 的链接属性含义只适用于当前文件作用域的变量和函数

---

**静态库（静态链接库）**

```c
$ tree
.
|-- main.c
`-- stack
    |-- is_empty.c
    |-- pop.c
    |-- push.c
    |-- stack.c
    `-- stack.h

1 directory, 6 files
```

先将源文件各自编译为目标文件：

```bash
$ gcc -c stack/stack.c stack/push.c stack/pop.c stack/is_empty.c
```

然后使用ar rs命令将这些目标文件打包为静态库：

```bash
$ ar rs libstack.a stack.o push.o pop.o is_empty.o
```

使用静态库：

```bash
$ gcc main.c -L. -lstack -Istack -o main
```

---

**共享库（动态链接库）**

组成共享库的目标文件和一般的目标文件有所不同，在编译时要加`-fPIC`选项，例如：

```bash
$ gcc -c -fPIC stack/stack.c stack/push.c stack/pop.c stack/is_empty.c
```

> 关键问题：-fPIC选项的作用？
> 

让我们先不加该选项：

```bash
$ gcc -c -g stack/stack.c stack/push.c stack/pop.c stack/is_empty.c
```

```nasm
$ objdump -dS push.o 

push.o:     file format elf32-i386

Disassembly of section .text:

00000000 <push>:
/* push.c */
extern char stack[512];
extern int top;

void push(char c)
{
   0:	55                   	push   %ebp
   1:	89 e5                	mov    %esp,%ebp
   3:	83 ec 04             	sub    $0x4,%esp
   6:	8b 45 08             	mov    0x8(%ebp),%eax
   9:	88 45 fc             	mov    %al,-0x4(%ebp)
	stack[++top] = c;
   c:	a1 00 00 00 00       	mov    0x0,%eax
  11:	83 c0 01             	add    $0x1,%eax
  14:	a3 00 00 00 00       	mov    %eax,0x0
  19:	8b 15 00 00 00 00    	mov    0x0,%edx
  1f:	0f b6 45 fc          	movzbl -0x4(%ebp),%eax
  23:	88 82 00 00 00 00    	mov    %al,0x0(%edx)
}
  29:	c9                   	leave  
  2a:	c3                   	ret
```

可以看到凡是用到`stack`和`top`的地址都用0x0表示，准备在重定位时修改。

使用readelf查看.rel.text段的信息：

```nasm
Relocation section '.rel.text' at offset 0x848 contains 4 entries:
 Offset     Info    Type            Sym.Value  Sym. Name
0000000d  00001001 R_386_32          00000000   top
00000015  00001001 R_386_32          00000000   top
0000001b  00001001 R_386_32          00000000   top
00000025  00001101 R_386_32          00000000   stack
```

其中被标出了指令中有四处需要在重定位时修改，这些地方在链接时会被修改为确定的地址。

现在来看看使用-fPIC生成的目标文件：

```nasm
$ gcc -c -g -fPIC stack/stack.c stack/push.c stack/pop.c stack/is_empty.c
$ objdump -dS push.o

push.o:     file format elf32-i386

Disassembly of section .text:

00000000 <push>:
/* push.c */
extern char stack[512];
extern int top;

void push(char c)
{
   0:	55                   	push   %ebp
   1:	89 e5                	mov    %esp,%ebp
   3:	53                   	push   %ebx
   4:	83 ec 04             	sub    $0x4,%esp
   7:	e8 fc ff ff ff       	call   8 <push+0x8>
   c:	81 c3 02 00 00 00    	add    $0x2,%ebx
  12:	8b 45 08             	mov    0x8(%ebp),%eax
  15:	88 45 f8             	mov    %al,-0x8(%ebp)
	stack[++top] = c;
  18:	8b 83 00 00 00 00    	mov    0x0(%ebx),%eax
  1e:	8b 00                	mov    (%eax),%eax
  20:	8d 50 01             	lea    0x1(%eax),%edx
  23:	8b 83 00 00 00 00    	mov    0x0(%ebx),%eax
  29:	89 10                	mov    %edx,(%eax)
  2b:	8b 83 00 00 00 00    	mov    0x0(%ebx),%eax
  31:	8b 08                	mov    (%eax),%ecx
  33:	8b 93 00 00 00 00    	mov    0x0(%ebx),%edx
  39:	0f b6 45 f8          	movzbl -0x8(%ebp),%eax
  3d:	88 04 0a             	mov    %al,(%edx,%ecx,1)
}
  40:	83 c4 04             	add    $0x4,%esp
  43:	5b                   	pop    %ebx
  44:	5d                   	pop    %ebp
  45:	c3                   	ret    

Disassembly of section .text.__i686.get_pc_thunk.bx:

00000000 <__i686.get_pc_thunk.bx>:
   0:	8b 1c 24             	mov    (%esp),%ebx
   3:	c3                   	ret
```

指令中用到的`stack`和`top`的地址不再以0x0表示，而是以`0x0(%ebx)`表示，但其中还是留有0x0准备做进一步修改。

> 关键发现：加入-fPIC选项后，引入了一个间接层！
> 

共享库（.so）在编译时并不知道自己会被加载到进程地址空间的哪个位置。同一个 libfoo.so 可能被程序 A 加载到 0x7f000000，被程序 B 加载到 0x7f500000。如果代码里写死了“变量 x 在 0x7f001234”这种绝对地址，换一个加载位置就全错了。

所以共享库的代码必须是**位置无关代码（PIC, Position-Independent Code）**：指令里不能出现依赖加载基址的绝对地址，**所有对外部符号的访问都要通过某种“相对于当前指令位置”或“通过一个可重定位的表”来间接完成**。

加 `-fPIC` 后，编译器访问外部符号（比如另一个共享库里的函数 `printf`、全局变量 `errno`）时，不再直接生成“跳到绝对地址”或“从绝对地址读”的指令，而是走一层**间接**：

- **对函数调用**：生成 `call printf@PLT`，即调用 PLT（Procedure Linkage Table）中的一个桩。PLT 桩再通过 GOT（Global Offset Table）拿到 `printf` 的真实地址，然后跳过去。**指令里编码的是“跳到 PLT 里某个相对位置”，而不是 `printf` 的绝对地址**。
- **对全局变量访问**：通过 GOT 条目间接寻址。代码先算出 GOT 相对于当前指令的偏移（利用 x86-64 的 RIP 相对寻址），从 GOT 里读出变量的真实地址，再解引用。**GOT 本身在加载时由动态链接器填好**。
- **对模块内但可能被 interpose 的符号**：还可能经过 GOT 或 PLT 绕一圈，而不是直接 PC 相对调用，以保证符号抢占（symbol interposition）语义正确。

> **指令里编码的不再是符号的绝对地址，而是相对于当前指令（或相对于 GOT 基址）的偏移**。
> 

代价是：**每次外部访问多一次内存读（读 GOT）和一次跳转（PLT），所以 PIC 代码通常比非 PIC 略慢、代码略大**。但共享库必须这么做，否则无法实现“同一份物理代码被多个进程映射到不同虚拟地址”这一共享库的基本前提。

## 21. **预处理**

C 语言的预处理（preprocessing）发生在编译之前，由预处理器对源文件做纯文本层面的处理

主要步骤可以简单列为：

1. **字符集与行拼接处理**：处理三字符组（trigraph，已废弃）、把反斜杠加换行的续行合并成一行、统一换行符等。
2. **注释替换**：把 `/* ... */` 和 `// ...` 注释替换成一个空格（注意：注释替换发生在宏展开之前）。
3. **处理预处理指令**：逐行识别以 `#` 开头的指令，按顺序执行：
    - `#include`：找到头文件，递归地把它插入到当前位置（头文件本身也要走一遍预处理）。
    - `#define` / `#undef`：定义和取消宏。
    - `#if` / `#ifdef` / `#ifndef` / `#elif` / `#else` / `#endif`：条件编译，决定哪些代码块保留、哪些丢弃。
    - `#line`、`#pragma`、`#error` 等：调整行号、实现定义行为、产生错误等。
4. **宏展开**：对保留下来文本中的宏调用进行替换展开（对象宏、函数宏，包括 `#` 字符串化、`##` 记号拼接、`__VA_ARGS__` 可变参数等），并递归展开宏展开结果中出现的宏。
5. **处理 `#include` 的嵌套与重复**：配合头文件保护（include guard 或 `#pragma once`）避免重复包含。
6. **输出预处理后的翻译单元**：得到一份不再含预处理指令、宏已展开、注释已去除的纯 C 代码，交给编译器做词法/语法分析。

**C标准规定了几个特殊的宏**，在不同的地方使用可以自动展开成不同的值，常用的有`__FILE__`和`__LINE__`，`__FILE__`展开为当前源文件的文件名，是一个字符串，`__LINE__`展开为当前代码行的行号，是一个整数。这两个宏在源代码中不同的位置使用会自动取不同的值，显然不是用`#define`能定义得出来的，它们是编译器内建的特殊的宏。在打印调试信息时打印这两个宏可以给开发者非常有用的提示。

## 22. **Makefile基础**

一个简单的Makefile：

```makefile
main: main.o stack.o maze.o
	gcc main.o stack.o maze.o -o main

main.o: main.c main.h stack.h maze.h
	gcc -c main.c

stack.o: stack.c stack.h main.h
	gcc -c stack.c

maze.o: maze.c maze.h main.h
	gcc -c maze.c
```

目标和条件之间的关系是：**欲更新目标，必须首先更新它的所有条件；所有条件中只要有一个条件被更新了，目标也必须随之被更新**。

所谓“更新”就是执行一遍规则中的命令列表，命令列表中的每条命令必须以一个Tab开头，注意不能是空格，Makefile的格式不像C语言的缩进那么随意，对于Makefile中的每个以Tab开头的命令，`make`会创建一个Shell进程去执行它。

在所有软件项目的Makefile中约定俗成的目标名字有：

- `all`，执行主要的编译工作，通常用作缺省目标。
- `install`，执行编译后的安装工作，把可执行文件、配置文件、文档等分别拷到不同的安装目录。
- `clean`，删除编译生成的二进制文件。
- `distclean`，不仅删除编译生成的二进制文件，也删除其它生成的文件，例如配置文件和格式转换后的文档，执行`make distclean`之后应该清除所有这些文件，只留下源文件。

Makefile支持一些隐藏规则：

```makefile
# default
OUTPUT_OPTION = -o $@

# default
CC = cc

# default
COMPILE.c = $(CC) $(CFLAGS) $(CPPFLAGS) $(TARGET_ARCH) -c

%.o: %.c
	$(COMPILE.c) $(OUTPUT_OPTION) $<
```

- `make`会查找隐含规则，发现隐含规则中有这样一条模式规则适用，`main.o`符合`%.o`的模式，现在`%`就代表`main`（称为`main.o`这个名字的Stem），再替换到`%.c`中就是`main.c`。
- `$@`的取值为规则中的目标
- `$<`的取值为规则中的第一个条件

## 23. **指针**

在C语言中，函数也是一种类型，可以定义指向函数的指针。

```c
#include <stdio.h>

void say_hello(const char *str)
{
	printf("Hello %s\n", str);
}

int main(void)
{
	void (*f)(const char *) = say_hello;
	f("Guys");
	return 0;
}
```

## 24. **函数接口**

**函数的调用者和函数的实现者之间订立了一个契约**，在调用函数之前，调用者要为实现者提供某些条件，在函数返回时，实现者要对调用者尽到某些义务。

如何描述这个契约呢？首先靠**函数接口**来描述，即函数名，参数，返回值，只要函数和参数的名字起得合理，参数和返回值的类型定得准确，至于这个函数怎么用，调用者单看函数接口就能猜出八九分了。

可变参数：

## 25. **C标准库**

Linux平台提供的C标准库包括：

- 一组头文件，定义了很多类型和宏，声明了很多库函数。这些头文件放在哪些目录下取决于不同的编译器，在我的系统上，`stdarg.h`和`stddef.h`位于`/usr/lib/gcc/i486-linux-gnu/4.3.2/include`目录下，`stdio.h`、`stdlib.h`、`time.h`、`math.h`、`assert.h`位于`/usr/include`目录下。C99标准定义的头文件有24个，本书只介绍其中最基本、最常用的几个。
- 一组库文件，提供了库函数的实现。大多数库函数在`libc`共享库中，有些库函数在另外的共享库中，例如数学函数在`libm`中。通常`libc`共享库是`/lib/libc.so.6`，而我的系统启用了hwcap机制，`libc`共享库是`/lib/tls/i686/cmov/libc.so.6`。

## 26. **链表、二叉树和哈希表d**

单链表的实现：

```c
/* linkedlist.h */
#ifndef LINKEDLIST_H
#define LINKEDLIST_H

typedef struct node *link;
struct node {
	unsigned char item;
	link next;
};

link make_node(unsigned char item);
void free_node(link p);
link search(unsigned char key);
void insert(link p);
void delete(link p);
void traverse(void (*visit)(link));
void destroy(void);
void push(link p);
link pop(void);

#endif
```

```c
/* linkedlist.c */
#include <stdlib.h>
#include "linkedlist.h"

static link head = NULL;

link make_node(unsigned char item)
{
	link p = malloc(sizeof *p);
	p->item = item;
	p->next = NULL;
	return p;
}

void free_node(link p)
{
	free(p);
}

link search(unsigned char key)
{
	link p;
	for (p = head; p; p = p->next)
		if (p->item == key)
			return p;
	return NULL;
}

void insert(link p)
{
	p->next = head;
	head = p;
}

void delete(link p)
{
	link pre;
	if (p == head) {
		head = p->next;
		return;
	}
	for (pre = head; pre; pre = pre->next)
		if (pre->next == p) {
			pre->next = p->next;
			return;
		}
}

void traverse(void (*visit)(link))
{
	link p;
	for (p = head; p; p = p->next)
		visit(p);
}

void destroy(void)
{
	link q, p = head;
	head = NULL;
	while (p) {
		q = p;
		p = p->next;
		free_node(q);
	}
}

void push(link p)
{
	insert(p);
}

link pop(void)
{
	if (head == NULL)
		return NULL;
	else {
		link p = head;
		head = head->next;
		return p;
	}
}
```

二叉树的实现：

```c
/* binarytree.h */
#ifndef BINARYTREE_H
#define BINARYTREE_H

typedef struct node *link;
struct node {
     unsigned char item;
     link l, r;
};

link init(unsigned char VLR[], unsigned char LVR[], int n);
void pre_order(link t, void (*visit)(link));
void in_order(link t, void (*visit)(link));
void post_order(link t, void (*visit)(link));
int count(link t);
int depth(link t);
void destroy(link t);

#endif
```

```c
/* binarytree.c */
#include <stdlib.h>
#include "binarytree.h"

static link make_node(unsigned char item)
{
	link p = malloc(sizeof *p);
	p->item = item;
	p->l = p->r = NULL;
	return p;
}

static void free_node(link p)
{
	free(p);
}

link init(unsigned char VLR[], unsigned char LVR[], int n)
{
	link t;
	int k;
	if (n <= 0)
		return NULL;
	for (k = 0; VLR[0] != LVR[k]; k++);
	t = make_node(VLR[0]);
	t->l = init(VLR+1, LVR, k);
	t->r = init(VLR+1+k, LVR+1+k, n-k-1);
	return t;
}

void pre_order(link t, void (*visit)(link))
{
	if (!t)
		return;
	visit(t);
	pre_order(t->l, visit);
	pre_order(t->r, visit);
}

void in_order(link t, void (*visit)(link))
{
	if (!t)
		return;
	in_order(t->l, visit);
	visit(t);
	in_order(t->r, visit);
}

void post_order(link t, void (*visit)(link))
{
	if (!t)
		return;
	post_order(t->l, visit);
	post_order(t->r, visit);
	visit(t);
}

int count(link t)
{
	if (!t)
		return 0;
	return 1 + count(t->l) + count(t->r);
}

int depth(link t)
{
	int dl, dr;
	if (!t)
		return 0;
	dl = depth(t->l);
	dr = depth(t->r);
	return 1 + (dl > dr ? dl : dr);
}

void destroy(link t)
{
	post_order(t, free_node);
}
```

BST的实现：

```c
/* bst.h */
#ifndef BST_H
#define BST_H

typedef struct node *link;
struct node {
     unsigned char item;
     link l, r;
};

link search(link t, unsigned char key);
link insert(link t, unsigned char key);
link delete(link t, unsigned char key);
void print_tree(link t);

#endif
```

```c
/* bst.c */
#include <stdlib.h>
#include <stdio.h>
#include "bst.h"

static link make_node(unsigned char item)
{
	link p = malloc(sizeof *p);
	p->item = item;
	p->l = p->r = NULL;
	return p;
}

static void free_node(link p)
{
	free(p);
}

link search(link t, unsigned char key)
{
	if (!t)
		return NULL;
	if (t->item > key)
		return search(t->l, key);
	if (t->item < key)
		return search(t->r, key);
	/* if (t->item == key) */
	return t;
}

link insert(link t, unsigned char key)
{
	if (!t)
		return make_node(key);
	if (t->item > key) /* insert to left subtree */
		t->l = insert(t->l, key);
	else /* if (t->item <= key), insert to right subtree */
		t->r = insert(t->r, key);
	return t;
}

link delete(link t, unsigned char key)
{
	link p;
	if (!t)
		return NULL;
	if (t->item > key) /* delete from left subtree */
		t->l = delete(t->l, key);
	else if (t->item < key) /* delete from right subtree */
		t->r = delete(t->r, key);
	else { /* if (t->item == key) */
		if (t->l == NULL && t->r == NULL) { /* if t is leaf node */
			free_node(t);
			t = NULL;
		} else if (t->l) { /* if t has left subtree */
			/* replace t with the rightmost node in left subtree */
			for (p = t->l; p->r; p = p->r);
			t->item = p->item;
			t->l = delete(t->l, t->item);
		} else { /* if t has right subtree */
			/* replace t with the leftmost node in right subtree */
			for (p = t->r; p->l; p = p->l);
			t->item = p->item;
			t->r = delete(t->r, t->item);
		}
	}
	return t;
}

void print_tree(link t)
{
	if (t) {
		printf("(");
		printf("%d", t->item);
		print_tree(t->l);
		print_tree(t->r);
		printf(")");
	} else
		printf("()");
}
```