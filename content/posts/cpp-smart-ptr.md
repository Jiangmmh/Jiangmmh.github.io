---
title: "关于C++智能指针"
date: '2026-10-23T16:41:27+08:00'
draft: false
tags: [C++, 智能指针, RAII, 内存管理]
categories: [C++]
---

# 一、简介

## 动态内存管理

在 C++ 中，内存管理一直是一个重要而又容易出错的问题。理解智能指针之前，我们需要先回答一个问题：**为什么程序需要动态内存？**

### 为什么需要动态内存？

在程序中，我们经常需要创建对象。对于生命周期和数量都能够提前确定的对象，可以直接使用局部变量、全局变量或其他具有适当存储期的对象。然而，在很多实际场景中，程序无法在编译时确定所需对象的数量、具体类型，甚至无法确定对象应该在什么时候销毁。

动态内存管理正是为了解决这些问题而存在的。

**1. 程序不知道自己需要多少对象**

考虑一个读取用户输入并处理数据的程序：

```cpp
#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;

    std::vector<int> data(n);

    for (int i = 0; i < n; ++i) {
        std::cin >> data[i];
    }

    // 处理数据
}
```

程序在运行之前并不知道用户会输入多少个整数。数据量取决于运行时的输入，因此程序需要在运行时管理相应的存储空间。

这里使用 `std::vector`，它能够根据需要管理动态分配的内存。我们不必手动申请和释放底层存储空间。

需要注意的是，动态内存并不意味着必须显式调用 `new`。标准容器、字符串以及其他资源管理类型已经封装了大量动态内存管理工作。

**2. 程序不知道所需对象的准确类型**

在面向对象程序中，我们可能需要根据运行时的信息创建不同类型的对象。

例如，一个图形程序需要处理圆形和矩形：

```cpp
#include <memory>

struct Shape {
    virtual ~Shape() = default;
    virtual void draw() = 0;
};

struct Circle : Shape {
    void draw() override {
        // 绘制圆形
    }
};

struct Rectangle : Shape {
    void draw() override {
        // 绘制矩形
    }
};

std::unique_ptr<Shape> createShape(bool isCircle) {
    if (isCircle) {
        return std::make_unique<Circle>();
    }

    return std::make_unique<Rectangle>();
}
```

调用者只需要知道自己获得了一个 `Shape` 对象，而不必提前确定其具体类型。

这类设计广泛存在于插件系统、图形界面、游戏引擎和各种基于多态的程序中。

不过，动态分配并不是实现多态的必要条件。这里使用动态对象，主要是为了让不同派生类型能够以统一的接口返回，并具有独立的生命周期。

**3. 程序需要在多个对象之间共享数据**

设想一个网络服务器，其中一个连接对象被多个组件使用：

- 网络模块负责接收数据；
- 业务模块负责处理请求；
- 日志模块负责记录连接状态。

如果这些组件需要共同持有同一个对象，而且该对象必须在最后一个使用者不再需要它时才能销毁，那么简单的局部变量生命周期可能就不够用了。

这时，可以考虑使用共享所有权机制，例如 `std::shared_ptr`。

但这里有一个重要区别：**共享数据不等于共享所有权。** 如果对象由某个明确的组件负责管理，其他组件只是临时访问它，那么引用或裸指针通常就足够了。只有当多个组件确实需要共同决定对象的存活时间时，共享所有权才有意义。

### 动态内存管理为什么容易出错？

动态内存为程序提供了灵活性，却也引入了一个关键问题：**对象的创建与销毁可能发生在不同的代码位置**。

例如：

```cpp
void process() {
    int* p = new int(42);

    // 执行其他操作

    delete p;
}
```

这段代码看起来很简单，但随着程序复杂度增加，手动管理内存会带来多种风险。

**1. 内存泄漏**

如果程序分配了内存，却忘记释放，那么这块内存就可能在不再需要后继续被占用。

```cpp
void process() {
    int* p = new int(42);

    if (some_condition()) {
        return;  // 忘记释放内存
    }

    delete p;
}
```

当条件成立时，函数直接返回，`delete p` 不会执行。

如果这种情况反复发生，程序占用的内存就可能持续增长。对于长期运行的服务器和系统软件，这类问题尤其值得重视。

**2. 使用释放后的内存（Use-After-Free）**

```cpp
int* p = new int(42);
delete p;

std::cout << *p;  // 未定义行为
```

释放内存后，指针变量 `p` 本身仍然存在，但它指向的对象已经结束生命周期。

继续访问该对象会导致未定义行为。程序可能崩溃，也可能暂时表现正常，或者在特定情况下引发安全漏洞。

**3. 重复释放同一块内存（Double Free）**

```cpp
int* p = new int(42);

delete p;
delete p;  // 未定义行为
```

同一块动态分配的内存不能被重复释放。实际程序中，这类问题往往与多个指针指向同一对象、复杂的错误处理流程或者不明确的所有权关系有关。

**4. 异常安全问题**

除了显式的提前返回，C++ 还有异常机制：

```cpp
void process() {
    int* p = new int(42);

    do_something_that_may_throw();

    delete p;
}
```

如果 `do_something_that_may_throw()` 抛出异常，控制流就不会正常执行到 `delete p`，从而导致内存泄漏。

这说明手动管理内存不仅需要考虑正常执行路径，还必须处理异常、提前返回以及复杂的控制流。

随着程序规模增加，要求每一条执行路径都正确释放资源，会变得越来越困难。

## RAII 与智能指针

### RAII：让资源生命周期跟随对象生命周期

为了解决资源管理问题，C++ 广泛采用了 RAII（Resource Acquisition Is Initialization，资源获取即初始化）这一编程惯用法。

RAII 的核心思想是：

**将资源的获取与一个对象的生命周期绑定，在对象销毁时自动释放所管理的资源。**

这里的资源不仅包括动态内存，还包括文件句柄、互斥锁、套接字和其他需要显式释放的系统资源。

例如：

```cpp
#include <fstream>

void process() {
    std::ofstream file("output.txt");

    file << "Hello, C++!\n";
}
```

当 `file` 离开作用域时，其析构函数会负责关闭文件。即使函数提前返回或抛出异常，只要对象正常完成栈展开，析构函数仍然会被调用。

这种机制利用了 C++ 的构造函数、析构函数和确定性的对象生命周期，将资源释放责任从程序员手动维护的控制流中移到了对象本身。

与依赖垃圾回收器定期识别不可达对象的机制不同，RAII 通常能够在对象生命周期结束时确定性地释放资源。

### 从 RAII 到智能指针

对于普通的局部对象，RAII 很容易实现：

```cpp
void process() {
    std::vector<int> data(1000);
    // 使用 data
}  // data 自动释放其管理的资源
```

但是，如果需要动态分配对象，并通过指针管理其生命周期，该怎么办？

早期 C++ 程序经常直接使用 `new` 和 `delete`。程序员必须自行保证对象只被正确销毁一次，而且不能在销毁后继续访问。

智能指针将 RAII 的思想应用到了动态内存管理中：**把动态对象的所有权交给一个具有明确管理规则的对象。**

例如：

```cpp
#include <memory>

void process() {
    auto p = std::make_unique<int>(42);

    // 使用 *p
}  // p 销毁时，自动释放其管理的 int 对象
```

这里的 `p` 本身是一个局部对象，而它负责管理另一个动态分配的对象。离开作用域时，`p` 的析构函数会自动释放所管理的对象。

即使函数提前返回或者抛出异常，只要 `p` 的生命周期正常结束，资源仍然能够得到正确释放。

智能指针并没有消除所有内存错误，但它能把许多容易遗漏的手动清理操作转化为由类型和对象生命周期保证的行为。

### 智能指针的历史：为什么 C++ 需要重新设计内存管理？

理解智能指针的设计动机，还需要了解它的发展过程。

**第一阶段：C++98 及以前的手动内存管理**

早期 C++ 程序主要通过 `new` 和 `delete` 管理动态对象。虽然这套机制提供了很大的灵活性，但也把资源释放的正确性大量交给了程序员。

例如，函数返回、异常处理、对象拷贝和多模块协作，都可能使对象的所有权变得模糊。

C++98 标准引入了 `std::auto_ptr`，试图通过一个管理对象的包装类型来自动释放动态内存。它是标准库早期探索智能指针的重要尝试，但其复制语义存在明显问题。

```cpp
#include <memory>

std::auto_ptr<int> p1(new int(42));
std::auto_ptr<int> p2 = p1;
```

在旧式 `auto_ptr` 的语义下，上述复制会转移所有权，导致 `p1` 不再拥有原来的对象。这与普通 C++ 对象的复制行为很不一样，容易让代码产生意料之外的结果。

因此，`auto_ptr` 后来被弃用，并在 C++17 中从标准中移除。

**第二阶段：Boost 智能指针与实践探索**

在现代智能指针进入标准库之前，Boost 等第三方库已经提供了 `shared_ptr`、`weak_ptr` 等类型。

这些工具在实际项目中积累了大量经验，也帮助 C++ 社区探索不同的资源所有权模型。

其中一个重要认识是：智能指针不应该只有一种行为。

有时，对象只应该有一个明确的所有者；有时，多个所有者需要共同延长对象的生命周期；还有时，程序需要观察对象，但不应延长其生命周期。

这些不同需求需要不同的类型来表达。

**第三阶段：C++11 引入现代智能指针**

C++11 正式引入了 `std::unique_ptr`、`std::shared_ptr` 和 `std::weak_ptr`，建立了现代 C++ 智能指针体系的重要基础。

它们分别对应三种不同的所有权语义：

- `std::unique_ptr`：独占所有权。
- `std::shared_ptr`：共享所有权。
- `std::weak_ptr`：不拥有对象的弱引用，可以观察由 `shared_ptr` 管理的对象。

与此同时，C++11 还引入了移动语义，使独占所有权能够在对象之间高效转移，而不必像 `auto_ptr` 那样通过普通复制操作隐式改变所有权。

C++14 又引入了 `std::make_unique`，使独占所有权对象的创建更加方便。

至此，现代 C++ 逐步形成了一种更清晰的资源管理思路：**通过智能指针类型表达所有权关系，通过对象生命周期管理资源，并尽量减少手动调用 `new` 和 `delete` 的需求**。

### Best Practice：优先使用 RAII，明确所有权

> 优先使用标准库容器、资源管理类和智能指针。除非确有必要，否则不要手动使用 `new` 和 `delete` 管理资源。

这条原则比“任何情况下都不要使用裸指针”更加准确。

裸指针仍然有重要用途。例如，函数可能只需要临时访问某个对象，并不负责管理它的生命周期：

```cpp
void printValue(const int* p) {
    if (p != nullptr) {
        std::cout << *p << '\n';
    }
}
```

这里的 `p` 可以表达一个非拥有的访问关系。但调用者必须保证对象在使用期间仍然有效。

因此，实践中可以遵循以下原则：

- 需要独占所有权时，优先使用 `std::unique_ptr`。
- 确实需要共享所有权时，使用 `std::shared_ptr`。
- 需要观察共享对象、但不延长其生命周期时，考虑 `std::weak_ptr`。
- 只需要访问对象而不负责其生命周期时，可以使用引用或裸指针。
- 管理数组、字符串和集合时，优先使用 `std::vector`、`std::string` 等标准库类型。

需要强调的是，智能指针不是自动消除所有内存错误的工具。它们无法自动修复悬空的非拥有指针、数据竞争、逻辑上的循环引用等所有问题。

智能指针真正的价值在于：**通过类型明确资源的所有权，让正确的资源管理方式成为代码结构的一部分。**

# 二、C++ 中的智能指针

以下接口以 C++20 为主要参考版本，涉及 C++14、C++17 和 C++26 的功能时会单独注明。

三种智能指针的接口都定义在 `<memory>` 中。

```cpp
#include <memory>
```

阅读接口时，可以把它们分为几类：

- **构造与赋值**：创建智能指针、复制或转移所有权。
- **修改操作**：重置指针、释放所有权、交换状态。
- **观察操作**：获取底层指针、访问对象、检查状态。
- **非成员函数**：工厂函数、类型转换、交换和比较等。

## `std::unique_ptr`

### 独占所有权

`std::unique_ptr` 表示独占所有权。同一时刻，一个动态对象只能由一个对应的 `unique_ptr` 所拥有。

```cpp
#include <memory>

auto p1 = std::make_unique<int>(42);

// auto p2 = p1;  // 编译错误：unique_ptr 不可复制

auto p2 = std::move(p1);  // 转移所有权
```

移动完成后，`p2` 接管原来的对象，`p1` 变为空指针。

禁止复制，可以在编译阶段阻止两个 `unique_ptr` 同时拥有同一个对象，从而避免重复释放等所有权问题。

### 构造函数

| 接口 | 作用 |
|---|---|
| `unique_ptr()` | 创建空智能指针 |
| `unique_ptr(nullptr)` | 创建空智能指针 |
| `unique_ptr(pointer)` | 接管一个原始指针所指向的对象 |
| `unique_ptr(pointer, deleter)` | 使用指定删除器管理对象 |
| 移动构造函数 | 从另一个 `unique_ptr` 转移所有权 |
| `unique_ptr` 数组特化 | 使用 `unique_ptr<T[]>` 管理动态数组 |

示例：

```cpp
auto p1 = std::make_unique<int>(42);

std::unique_ptr<int> p2(new int(100));

std::unique_ptr<int> p3 = std::move(p2);
```

通常推荐使用 `std::make_unique`，而不是在业务代码中直接调用 `new`。

### 赋值操作

| 接口 | 作用 |
|---|---|
| `operator=(unique_ptr&&)` | 移动赋值，接管另一个智能指针的对象 |
| `operator=(nullptr)` | 释放当前管理的对象并变为空指针 |
| 删除的复制赋值运算符 | 禁止复制所有权 |

```cpp
auto p1 = std::make_unique<int>(42);
auto p2 = std::make_unique<int>(100);

p1 = std::move(p2);
```

移动赋值后，`p1` 管理原来属于 `p2` 的对象；`p1` 原来管理的对象会被释放，`p2` 变为空指针。

### 修改操作（Modifiers）

| 接口 | 作用 | 注意事项 |
|---|---|---|
| `release()` | 返回底层指针，并放弃所有权 | 不会释放对象 |
| `reset()` | 释放当前对象并变为空指针 | 调用后不再拥有原对象 |
| `reset(p)` | 改为管理新的原始指针 | 必须保证所有权关系正确 |
| `swap(other)` | 与另一个智能指针交换管理状态 | 不复制对象 |

**重点区分 `release()` 和 `reset()`：**

```cpp
auto p = std::make_unique<int>(42);

int* raw = p.release();
// p 变为空，raw 接管了资源的责任
delete raw;
```

`release()` 不会删除对象。调用后，程序员必须自行接管并正确释放返回的原始指针。

相比之下：

```cpp
auto p = std::make_unique<int>(42);

p.reset();  // 释放对象
```

`reset()` 会调用删除器释放原来管理的对象。

因此，除非确实需要与不使用智能指针的接口交互，否则不应该随意调用 `release()`。

### 观察操作（Observers）

| 接口 | 作用 |
|---|---|
| `get()` | 获取底层原始指针，但不转移所有权 |
| `get_deleter()` | 获取删除器的引用 |
| `operator*()` | 解引用，访问所指对象 |
| `operator->()` | 通过指针访问对象成员 |
| `operator bool()` | 判断是否持有非空指针 |
| `operator[]()` | 访问数组元素，仅适用于 `unique_ptr<T[]>` |

示例：

```cpp
auto p = std::make_unique<int>(42);

if (p) {
    std::cout << *p << '\n';
}

int* raw = p.get();  // 仅借用指针
```

`get()` 不会转移所有权，也不应该对返回的指针直接调用 `delete`。

对于数组：

```cpp
auto arr = std::make_unique<int[]>(10);

arr[0] = 100;
arr[1] = 200;
```

这里的 `unique_ptr<int[]>` 使用数组删除方式管理动态数组。

### 非成员函数与辅助工具

| 接口 | 作用 |
|---|---|
| `std::make_unique<T>(args...)` | 创建并返回独占智能指针（C++14） |
| `std::make_unique<T[]>(n)` | 创建动态数组智能指针（C++14） |
| `std::make_unique_for_overwrite<T>()` | 创建默认不进行值初始化的对象（C++20） |
| `std::swap(a, b)` | 交换两个智能指针 |
| 比较运算符 | 比较智能指针所存储的指针值 |
| `std::hash<std::unique_ptr<...>>` | 为适用的智能指针提供哈希支持 |
| `std::default_delete<T>` | 默认删除器 |

其中，`make_unique_for_overwrite` 适合后续会完整写入对象或数组的场景。对于基本类型，它不会替你初始化数值；在读取之前必须确保对应元素已被赋值。

自定义删除器也是 `unique_ptr` 的重要能力。例如，管理需要特殊释放函数的资源时，可以指定删除器，而不必局限于 `delete`。

### 适用场景

- 对象具有明确的单一所有者。
- 工厂函数需要返回动态创建的对象。
- 通过基类指针管理派生类对象。
- PImpl 等需要隐藏实现细节的设计。
- 管理文件句柄或其他需要自定义删除器的资源。

如果没有共享所有权需求，`unique_ptr` 通常是更简单、更清晰的选择。

接口参考：[cppreference — `std::unique_ptr`](https://en.cppreference.com/w/cpp/memory/unique_ptr)

## `std::shared_ptr`

### 共享所有权

`std::shared_ptr` 允许多个智能指针共同拥有同一个对象。当最后一个拥有该对象的 `shared_ptr` 被销毁、重置或改为管理其他对象时，被管理对象才会被销毁。

```cpp
#include <iostream>
#include <memory>

int main() {
    auto p1 = std::make_shared<int>(42);

    {
        auto p2 = p1;
        std::cout << p1.use_count() << '\n';  // 通常为 2
    }

    std::cout << p1.use_count() << '\n';      // 1
}
```

### 构造函数

| 接口 | 作用 |
|---|---|
| `shared_ptr()` | 创建空智能指针 |
| `shared_ptr(nullptr)` | 创建空智能指针 |
| `shared_ptr(Y*)` | 接管原始指针所指向的对象 |
| `shared_ptr(Y*, deleter)` | 使用自定义删除器 |
| `shared_ptr(Y*, deleter, allocator)` | 指定删除器与分配器 |
| 复制构造函数 | 与另一个 `shared_ptr` 共享所有权 |
| 移动构造函数 | 转移智能指针状态 |
| 别名构造函数 | 共享一个对象的所有权，但存储指向该对象某个子对象的指针 |
| 从 `weak_ptr` 构造 | 如果弱引用对应的对象仍存活，则共享其所有权 |
| 从 `unique_ptr` 构造 | 接管独占智能指针的所有权 |

示例：

```cpp
auto p1 = std::make_shared<int>(42);
auto p2 = p1;  // 共享所有权
auto p3 = std::move(p1);  // 移动所有权句柄
```

注意，不能用同一个原始指针分别构造两个独立的 `shared_ptr`：

```cpp
int* raw = new int(42);

std::shared_ptr<int> p1(raw);
// std::shared_ptr<int> p2(raw);  // 错误的所有权设计
```

两个独立的控制块可能分别尝试删除同一个对象。正确做法是复制已有的 `shared_ptr`，或者使用 `make_shared` 创建对象。

### 赋值操作

| 接口 | 作用 |
|---|---|
| `operator=(const shared_ptr&)` | 复制赋值，共享所有权 |
| `operator=(shared_ptr&&)` | 移动赋值 |
| `operator=(nullptr)` | 释放当前所有权并变为空指针 |
| `operator=(unique_ptr&&)` | 接管独占智能指针的对象 |

复制 `shared_ptr` 通常会增加共享所有权计数；移动 `shared_ptr` 则会转移其状态。

### 修改操作（Modifiers）

| 接口 | 作用 |
|---|---|
| `reset()` | 放弃当前共享所有权 |
| `reset(p)` | 改为管理新的原始指针 |
| `reset(p, deleter)` | 使用指定删除器管理新对象 |
| `reset(p, deleter, allocator)` | 同时指定删除器和分配器 |
| `swap(other)` | 交换两个智能指针的状态 |

调用 `reset()` 不一定会销毁对象。如果其他 `shared_ptr` 仍然拥有该对象，对象就会继续存活。

### 观察操作（Observers）

| 接口 | 作用 |
|---|---|
| `get()` | 获取存储的原始指针 |
| `operator*()` | 解引用对象 |
| `operator->()` | 访问对象成员 |
| `operator bool()` | 判断存储的指针是否为空 |
| `use_count()` | 返回当前共享所有权计数 |
| `operator[]()` | 访问数组元素（C++17，适用的数组特化） |
| `owner_before(other)` | 按共享所有权关系进行比较 |

`use_count()` 适合用于观察和调试，不适合用作复杂的并发同步条件。在多线程环境下，计数可能随时发生变化。

别名构造函数还意味着：`get()` 返回的存储指针不一定是最终负责销毁的对象指针。因此，存储指针的值与实际所有权关系并不总是一回事。

### 工厂函数与非成员工具

| 接口 | 作用 |
|---|---|
| `std::make_shared<T>(args...)` | 创建对象并返回共享智能指针 |
| `std::make_shared_for_overwrite<T>()` | 创建默认不进行值初始化的对象（C++20） |
| `std::allocate_shared<T>(allocator, args...)` | 使用指定分配器创建共享对象 |
| `std::allocate_shared_for_overwrite<T>(allocator)` | 使用指定分配器创建不进行值初始化的对象（C++20） |
| `std::static_pointer_cast<T>(p)` | 执行静态指针类型转换 |
| `std::dynamic_pointer_cast<T>(p)` | 执行动态指针类型转换 |
| `std::const_pointer_cast<T>(p)` | 执行 `const_cast` 对应的转换 |
| `std::reinterpret_pointer_cast<T>(p)` | 执行重解释指针转换（C++17） |
| `std::get_deleter<D>(p)` | 获取匹配类型的删除器 |
| `std::swap(a, b)` | 交换两个共享智能指针 |
| `std::hash<std::shared_ptr<T>>` | 为适用的共享智能指针提供哈希支持 |

四种 `*_pointer_cast` 的智能指针版本能够在保留共享所有权关系的同时完成相应的指针转换。它们不应被理解为可以无条件安全地转换任意类型：例如，`dynamic_pointer_cast` 在运行时类型不匹配时会返回空指针。

### 线程安全需要注意什么？

`shared_ptr` 的共享所有权计数由标准库实现负责安全维护，但这不意味着被管理对象本身是线程安全的。

还需要区分两件事：

- 多个线程操作各自独立的 `shared_ptr` 实例，即使它们共享同一个对象，引用计数管理也受到标准保证。
- 多个线程同时读写同一个 `shared_ptr` 实例，如果其中涉及冲突的非原子访问且没有同步，就可能产生数据竞争。

C++20 提供了 `std::atomic<std::shared_ptr<T>>`，用于需要原子操作共享指针句柄的场景。它仍然不会自动保证被管理对象内部状态的线程安全。

### 适用场景

- 多个组件确实需要共同拥有同一个对象。
- 对象的销毁时机取决于最后一个所有者。
- 需要通过弱引用观察共享对象。
- 需要在共享所有权关系中进行类型转换。

不要因为 `shared_ptr` 使用方便，就把所有对象都交给它管理。共享所有权会引入额外的引用计数开销，也可能使生命周期关系变得难以理解。

接口参考：[cppreference — `std::shared_ptr`](https://en.cppreference.com/w/cpp/memory/shared_ptr)

## std::weak_ptr

### 不拥有对象的弱引用

`std::weak_ptr` 用于观察由 `std::shared_ptr` 管理的对象，但不会通过自身延长对象的生命周期。

```cpp
#include <iostream>
#include <memory>

int main() {
    auto shared = std::make_shared<int>(42);
    std::weak_ptr<int> weak = shared;

    if (auto locked = weak.lock()) {
        std::cout << *locked << '\n';
    }
}
```

`weak.lock()` 会尝试获取一个 `shared_ptr`。如果对象仍然存活，就会得到一个有效的共享指针；如果对象已经销毁，则会得到空的 `shared_ptr`。

### 构造函数

| 接口 | 作用 |
|---|---|
| `weak_ptr()` | 创建空弱引用 |
| `weak_ptr(nullptr)` | 创建空弱引用 |
| `weak_ptr(const weak_ptr&)` | 复制弱引用 |
| `weak_ptr(weak_ptr&&)` | 移动弱引用 |
| `weak_ptr(const shared_ptr&)` | 从共享智能指针创建弱引用 |
| 兼容类型的转换构造函数 | 从兼容的 `weak_ptr` 或 `shared_ptr` 创建弱引用 |

```cpp
auto shared = std::make_shared<int>(42);
std::weak_ptr<int> weak = shared;
```

创建 `weak_ptr` 不会增加共享所有权计数，但会维护控制块所需的弱引用状态。

### 赋值操作

| 接口 | 作用 |
|---|---|
| `operator=(const weak_ptr&)` | 复制弱引用 |
| `operator=(weak_ptr&&)` | 移动弱引用 |
| `operator=(const shared_ptr&)` | 从共享智能指针更新弱引用 |

弱引用只观察对象，不负责决定对象何时销毁。

### 修改操作（Modifiers）

| 接口 | 作用 |
|---|---|
| `reset()` | 清空弱引用 |
| `swap(other)` | 交换两个弱引用的状态 |

`reset()` 只会释放当前弱引用持有的控制块关联，不会因为调用它就销毁仍由其他 `shared_ptr` 拥有的对象。

### 观察操作（Observers）

| 接口 | 作用 |
|---|---|
| `use_count()` | 返回当前共享所有权计数 |
| `expired()` | 判断被观察的对象是否已经失去共享所有权 |
| `lock()` | 尝试获取一个共享智能指针 |
| `owner_before(other)` | 按所有权关系比较两个弱引用 |

其中，`lock()` 是最重要的接口：

```cpp
if (auto p = weak.lock()) {
    // p 在当前作用域内拥有对象
    use_object(*p);
} else {
    // 对象已经不存在
}
```

相比于先调用 `expired()` 再单独访问对象，直接调用 `lock()` 更适合并发环境。因为检查和获取临时共享所有权由 `lock()` 原子地完成，避免对象在检查之后、获取所有权之前被销毁。

### 非成员工具

| 接口 | 作用 |
|---|---|
| `std::swap(a, b)` | 交换两个弱引用 |
| `std::atomic<std::weak_ptr<T>>` | 原子管理弱引用句柄（C++20） |

与 `shared_ptr` 一样，弱引用也支持基于所有权关系的比较接口。

### 使用 `weak_ptr` 打破循环引用

考虑一个双向链表：

```cpp
#include <memory>

struct Node {
    int value{};
    std::shared_ptr<Node> next;
    std::weak_ptr<Node> previous;
};
```

`next` 表示拥有关系，`previous` 表示非拥有关系。

这样可以避免仅仅因为双向链接就让两个节点互相延长生命周期。

如果两个节点通过 `shared_ptr` 相互拥有，即使外部不再持有它们，引用计数也可能始终无法归零，造成内存泄漏。

`weak_ptr` 的设计价值就在于：它允许程序观察对象是否存活，而不必成为对象生命周期的决定者。

接口参考：[cppreference — `std::weak_ptr`](https://en.cppreference.com/w/cpp/memory/weak_ptr)

# 三、libc++ 智能指针源码分析
## unique_ptr 源码分析

我使用AI对源码进行了重新整理：保留核心成员、构造与移动语义、析构、访问接口和资源管理操作，删除条件编译、模板 SFINAE、ABI 属性及其他实现细节。

unique_ptr的实现特点如下：

- 禁止共享所有权：拷贝构造函数和拷贝赋值运算符被禁用
- 支持移动构造：虽然不能共享所有权，但允许转移所有权
- release()方法：放弃所有权，将内部指针置为nullptr，并返回资源的指针
- reset()方法：替换其所管理的资源，并释放旧资源

完整源码见[LLVM libc++ uniuqe_ptr.h](https://github.com/llvm/llvm-project/blob/main/libcxx/include/__memory/unique_ptr.h#L119)。
```c++
#include <utility>
#include <cstddef>

template <typename T>
struct default_delete {
    constexpr default_delete() noexcept = default;

    void operator()(T* ptr) const noexcept {
        delete ptr;
    }
};

template <typename T, typename Deleter = default_delete<T>>
class unique_ptr {
public:
    using element_type = T;
    using deleter_type = Deleter;
    using pointer = T*;

private:
    pointer ptr_ = nullptr;
    deleter_type deleter_;

public:
    // 1. 构造函数
    constexpr unique_ptr() noexcept = default;

    explicit unique_ptr(pointer ptr) noexcept
        : ptr_(ptr) {}

    unique_ptr(pointer ptr, const deleter_type& deleter) noexcept
        : ptr_(ptr), deleter_(deleter) {}

    // 2. 禁止拷贝：独占所有权
    unique_ptr(const unique_ptr&) = delete;
    unique_ptr& operator=(const unique_ptr&) = delete;

    // 3. 移动构造：转移所有权
    unique_ptr(unique_ptr&& other) noexcept
        : ptr_(other.release()),
          deleter_(std::move(other.deleter_)) {}

    // 4. 移动赋值：释放当前资源，再接管新资源
    unique_ptr& operator=(unique_ptr&& other) noexcept {
        if (this != &other) {
            reset(other.release());
            deleter_ = std::move(other.deleter_);
        }
        return *this;
    }

    // 5. 析构：自动释放资源
    ~unique_ptr() {
        reset();
    }

    // 6. 访问资源
    T& operator*() const noexcept {
        return *ptr_;
    }

    pointer operator->() const noexcept {
        return ptr_;
    }

    pointer get() const noexcept {
        return ptr_;
    }

    deleter_type& get_deleter() noexcept {
        return deleter_;
    }

    explicit operator bool() const noexcept {
        return ptr_ != nullptr;
    }

    // 7. 放弃所有权，但不释放资源
    pointer release() noexcept {
        pointer temp = ptr_;
        ptr_ = nullptr;
        return temp;
    }

    // 8. 替换管理的资源，并释放旧资源
    void reset(pointer ptr = nullptr) noexcept {
        pointer old = ptr_;
        ptr_ = ptr;

        if (old != nullptr) {
            deleter_(old);
        }
    }

    // 9. 交换两个智能指针
    void swap(unique_ptr& other) noexcept {
        using std::swap;
        swap(ptr_, other.ptr_);
        swap(deleter_, other.deleter_);
    }
};

```

## shared_ptr 源码分析

### shared_ptr的两个核心对象
两个指针承担不同职责：
- **__ptr_**：指向当前 shared_ptr 所管理的对象（资源）。
- **__cntrl_**：指向共享控制块，负责引用计数以及对象的生命周期管理。

拷贝构造时，两个指针都被复制，但还会调用 __add_shared() 增加强引用计数。移动构造则直接转移指针并清空源对象，不增加引用计数。析构时，调用 __release_shared() 释放一个强引用。

注意，shared_ptr 的 __ptr_ 和控制块所管理的对象不一定是同一个地址。例如，别名构造函数可以让 __ptr_ 指向某个对象的成员，而 __cntrl_ 仍然共享原对象的控制块。

```c++
template <class _Tp>
class _LIBCPP_SHARED_PTR_TRIVIAL_ABI shared_ptr {
public:
  typedef remove_extent_t<_Tp> element_type;

private:
  element_type* __ptr_;             // 指向管理的对象
  __shared_weak_count* __cntrl_;    // 指向共享控制快

public:
  _LIBCPP_HIDE_FROM_ABI
  _LIBCPP_CONSTEXPR shared_ptr() _NOEXCEPT      // 默认构造函数
      : __ptr_(nullptr), __cntrl_(nullptr) {}

  _LIBCPP_HIDE_FROM_ABI
  shared_ptr(const shared_ptr& __r) _NOEXCEPT   // 拷贝构造函数
      : __ptr_(__r.__ptr_), __cntrl_(__r.__cntrl_) {
    if (__cntrl_)
      __cntrl_->__add_shared();     // 增加引用计数
  }

  _LIBCPP_HIDE_FROM_ABI
  shared_ptr(shared_ptr&& __r) _NOEXCEPT        // 移动构造函数
      : __ptr_(__r.__ptr_), __cntrl_(__r.__cntrl_) {
    __r.__ptr_   = nullptr;
    __r.__cntrl_ = nullptr;
  }

  _LIBCPP_HIDE_FROM_ABI
  ~shared_ptr() {         // 析构函数
    if (__cntrl_)
      __cntrl_->__release_shared(); // 减少引用计数
  }

  [[__nodiscard__]]
  _LIBCPP_HIDE_FROM_ABI
  element_type* get() const _NOEXCEPT {
    return __ptr_;
  }

  [[__nodiscard__]]
  _LIBCPP_HIDE_FROM_ABI
  long use_count() const _NOEXCEPT { // 返回引用计数
    return __cntrl_ ? __cntrl_->use_count() : 0;
  }
};
```
### __shared_ptr_pointer：普通指针对应的共享控制块
> 在外部先单独分配对象，再单独分配控制块。

这种控制块（`__shared_ptr_pointer`）在通过普通指针构造shared_ptr时使用。

其中包含了两个虚函数：
- **__on_zero_shared()**： 强引用归零后，调用删除器处理所管理的指针，并结束相关成员的生命周期。
- **__on_zero_shared_weak()**：弱引用也归零后，使用对应的分配器释放控制块内存。

控制块继承了 `__shared_weak_count`，所以引用计数的通用逻辑不需要重复写在这个派生类中。派生类只负责如何销毁具体资源，以及如何释放自身内存。

```c++
template <class _Tp, class _Dp, class _Alloc>
class _LIBCPP_HIDE_STRUCT_FROM_ABI
    __shared_ptr_pointer final : public __shared_weak_count {
  _LIBCPP_NO_UNIQUE_ADDRESS _Alloc __alloc_;
  _LIBCPP_NO_UNIQUE_ADDRESS _Dp __deleter_;
  _LIBCPP_NO_UNIQUE_ADDRESS _Tp __ptr_;

public:
  _LIBCPP_HIDE_FROM_ABI
  __shared_ptr_pointer(_Tp __p, _Dp __d, _Alloc __a)
      : __alloc_(std::move(__a)),
        __deleter_(std::move(__d)),
        __ptr_(__p) {}

private:
  _LIBCPP_HIDE_FROM_ABI_VIRTUAL
  void __on_zero_shared() _NOEXCEPT override {
    __deleter_(__ptr_);
    __ptr_.~_Tp();
    __deleter_.~_Dp();
  }

  _LIBCPP_HIDE_FROM_ABI_VIRTUAL
  void __on_zero_shared_weak() _NOEXCEPT override {
    using __alloc_t =
        __allocator_traits_rebind_t<_Alloc, __shared_ptr_pointer>;

    __alloc_t __a(__alloc_);
    __alloc_.~_Alloc();

    __a.deallocate(
        pointer_traits<typename allocator_traits<__alloc_t>::pointer>
            ::pointer_to(*this),
        1);
  }
};
```

### __shared_ptr_emplace：make_shared 使用的控制块
构造对象时，与 `__shared_ptr_pointer` 相比，这里没有单独保存一个外部传入的 `__ptr_`。对象的存储空间直接位于控制块的 `__buffer_` 中。

销毁对象时，`__on_zero_shared()` 调用分配器的 `destroy()`；等控制块自身也不再需要时，`__on_zero_shared_weak()` 再释放控制块内存。

> 这正是理解 make_shared 内存组织方式的关键：对象存储和控制块存储由同一次控制块分配承载，而不是先单独分配对象，再单独分配控制块。


```c++
template <class _Tp, class _Alloc>
struct _LIBCPP_HIDE_STRUCT_FROM_ABI
    __shared_ptr_emplace : __shared_weak_count {
  using __alloc_traits = allocator_traits<_Alloc>;
  using __value_type   = __remove_cv_t<_Tp>;

  template <class... _Args>
  _LIBCPP_HIDE_FROM_ABI
  explicit __shared_ptr_emplace(_Alloc __a, _Args&&... __args)
      : __alloc_(std::move(__a)) {
    allocator_traits<_Alloc>::construct(
        __alloc_, __get_elem(), std::forward<_Args>(__args)...);
  }

  _LIBCPP_HIDE_FROM_ABI
  __value_type* __get_elem() _NOEXCEPT {
    return reinterpret_cast<__value_type*>(__buffer_);
  }

private:
  _LIBCPP_HIDE_FROM_ABI_VIRTUAL
  void __on_zero_shared() _NOEXCEPT override {
    allocator_traits<_Alloc>::destroy(__alloc_, __get_elem());
  }

  _LIBCPP_HIDE_FROM_ABI_VIRTUAL
  void __on_zero_shared_weak() _NOEXCEPT override {
    using __alloc_t =
        __allocator_traits_rebind_t<_Alloc, __shared_ptr_emplace>;

    __alloc_t __tmp(__alloc_);
    __alloc_.~_Alloc();

    allocator_traits<__alloc_t>::deallocate(
        __tmp,
        pointer_traits<typename allocator_traits<__alloc_t>::pointer>
            ::pointer_to(*this),
        1);
  }

  _LIBCPP_NO_UNIQUE_ADDRESS _Alloc __alloc_;
  _ALIGNAS_TYPE(__value_type) char __buffer_[sizeof(__value_type)];
};
```

### shared_ptr 如何创建控制块

解释一下：
1. `__ptr_(__p)` 保存原始指针。
2. `unique_ptr<_Yp> __hold(__p)` 暂时接管指针，避免创建控制块时发生异常而泄漏对象。
3. 创建 `__shared_ptr_pointer` 控制块，保存指针、删除器和分配器。
4. 控制块创建成功后，调用 `__hold.release()` 交出临时所有权。
5. 调用 `__enable_weak_this()`，处理对象继承 `enable_shared_from_this` 的情形。
因此，控制块不是简单的计数器；它还保存了对象销毁所需要的信息。

```c++
template <class _Yp, /* 原源码中的模板约束 */>
_LIBCPP_HIDE_FROM_ABI
explicit shared_ptr(_Yp* __p) : __ptr_(__p) {
  unique_ptr<_Yp> __hold(__p);
  
  typedef typename __shared_ptr_default_allocator<_Yp>::type _AllocT;
  typedef __shared_ptr_pointer<
      _Yp*,
      __shared_ptr_default_delete<_Tp, _Yp>,
      _AllocT
  > _CntrlBlk;
  
  // 分配控制块
  __cntrl_ = new _CntrlBlk(
      __p, __shared_ptr_default_delete<_Tp, _Yp>(), _AllocT());
  
  __hold.release();
  __enable_weak_this(__p, __p);
}
```

### make_shared 的调用链
这里的 __allocation_guard 不是多余的辅助代码：它负责在控制块构造失败等异常路径中管理尚未交出的分配资源。

```c++
template <class _ControlBlock, class _Tp, class _Alloc, class... _Args>
shared_ptr<_Tp> __allocate_shared_impl(
    const _Alloc& __alloc, _Args&&... __args) {
  using _ControlBlockAllocator =
      typename __allocator_traits_rebind<_Alloc, _ControlBlock>::type;

  __allocation_guard<_ControlBlockAllocator> __guard(__alloc, 1);

  ::new ((void*)std::addressof(*__guard.__get()))
      _ControlBlock(__alloc, std::forward<_Args>(__args)...);

  auto __control_block = __guard.__release_ptr();

  return shared_ptr<_Tp>::__create_with_control_block(
      __control_block->__get_elem(),
      std::__to_address(__control_block));
}

template <class _Tp, class _Alloc, class... _Args,
          __enable_if_t<!is_array<_Tp>::value, int> = 0>
shared_ptr<_Tp> allocate_shared(
    const _Alloc& __a, _Args&&... __args) {
  using _CanonicalAlloc =
      __allocator_traits_rebind_t<_Alloc, __remove_cv_t<_Tp>>;

  using _ControlBlock =
      __shared_ptr_emplace<_Tp, _CanonicalAlloc>;

  return std::__allocate_shared_impl<_ControlBlock, _Tp>(
      _CanonicalAlloc(__a),
      std::forward<_Args>(__args)...);
}

template <class _Tp, class... _Args,
          __enable_if_t<!is_array<_Tp>::value, int> = 0>
shared_ptr<_Tp> make_shared(_Args&&... __args) {
  return std::allocate_shared<_Tp>(
      allocator<__remove_cv_t<_Tp>>(),
      std::forward<_Args>(__args)...);
}
```

```
make_shared<T>(args...)
    └── allocate_shared<T>(allocator, args...)
          ├── 确定控制块类型 __shared_ptr_emplace
          └── __allocate_shared_impl(...)
                ├── 分配控制块内存
                ├── 在内存中构造控制块及其管理的对象
                ├── 释放 allocation_guard 的资源管理权
                └── __create_with_control_block(...)
                      └── 组装 shared_ptr 的对象指针和控制块指针
```

关键区别：
- `make_shared()`：提供默认分配器。
- `allocate_shared()`：确定规范化分配器和具体控制块类型。
- `__allocate_shared_impl()`：负责分配、构造控制块，并创建最终的 `shared_ptr`。
其中，`__shared_ptr_emplace` 的具体实现决定了对象如何存储在控制块中；`__create_with_control_block()` 则将对象指针与控制块指针设置到 `shared_ptr` 的 `__ptr_` 和 `__cntrl_` 成员中。

## weak_ptr 源码分析
weak_ptr源码位于：[libcxx/include/__memory/shared_ptr.h](https://github.com/llvm/llvm-project/blob/main/libcxx/include/__memory/shared_ptr.h?utm_source=chatgpt.com)。

下面保留源码中的真实成员和函数名，省略部分模板约束、ABI 属性及与核心逻辑无关的重载。

```c++
template <class _Tp>
class  weak_ptr {
public:
  typedef remove_extent_t<_Tp> element_type;

private:
  element_type* __ptr_;           // 指向被观察的对象，或数组的元素
  __shared_weak_count* __cntrl_;  // 指向对象对应的控制块，查询强引用计数，并尝试获取强引用

public:
  weak_ptr() _NOEXCEPT
      : __ptr_(nullptr), __cntrl_(nullptr) {}

  weak_ptr(shared_ptr<_Yp> const& __r) _NOEXCEPT
      : __ptr_(__r.__ptr_), __cntrl_(__r.__cntrl_) {
    if (__cntrl_)   // 如果控制块存在，调用 __add_weak() 增加弱引用计数。
      __cntrl_->__add_weak();
  }

  weak_ptr(weak_ptr const& __r) _NOEXCEPT
    : __ptr_(__r.__ptr_), __cntrl_(__r.__cntrl_) {
    if (__cntrl_)
        __cntrl_->__add_weak(); // 增加弱引用计数
    }

  weak_ptr(weak_ptr&& __r) _NOEXCEPT
    : __ptr_(__r.__ptr_), __cntrl_(__r.__cntrl_) {
    __r.__ptr_   = nullptr;
    __r.__cntrl_ = nullptr;
  }

  weak_ptr& operator=(weak_ptr const& __r) _NOEXCEPT {
    weak_ptr(__r).swap(*this);
    return *this;
  }
  
  ~weak_ptr() {
    if (__cntrl_)
      __cntrl_->__release_weak();
  }

  void swap(weak_ptr& __r) _NOEXCEPT {
    std::swap(__ptr_, __r.__ptr_);
    std::swap(__cntrl_, __r.__cntrl_);
  }

  void reset() _NOEXCEPT {
    weak_ptr().swap(*this);
  }

  long use_count() const _NOEXCEPT {
    return __cntrl_ ? __cntrl_->use_count() : 0;
  }

  bool expired() const _NOEXCEPT {
    return __cntrl_ == nullptr || __cntrl_->use_count() == 0;
  }

  shared_ptr<_Tp> lock() const _NOEXCEPT {
    shared_ptr<_Tp> __r;
    __r.__cntrl_ = __cntrl_ ? __cntrl_->lock() : __cntrl_;
    if (__r.__cntrl_)
      __r.__ptr_ = __ptr_;
    return __r;
  }
};
```

# 4. 总结与最佳实践

C++ 智能指针的发展，本质上是 C++ 不断改进资源管理方式的过程。

从早期的手动 `new` 和 `delete`，到 `auto_ptr` 的探索，再到 C++11 引入的现代智能指针，设计重点逐渐从“如何释放内存”转向“如何明确表达资源所有权”。

在实际开发中，可以记住以下原则：

1. **优先采用 RAII。** 让资源获取与对象生命周期绑定，避免依赖手动清理代码。
2. **优先使用 `unique_ptr`。** 如果没有明确的共享所有权需求，就不必引入引用计数。
3. **谨慎使用 `shared_ptr`。** 只有多个组件确实需要共同拥有对象时，才使用共享所有权。
4. **使用 `weak_ptr` 表达非拥有的共享对象观察关系。** 特别是在需要打破共享所有权循环时。
5. **不要把智能指针等同于所有指针。** 引用和裸指针仍然适合表达非拥有访问，但必须保证对象在使用期间有效。
6. **优先使用标准库容器和工厂函数。** 例如 `std::vector`、`std::string`、`std::make_unique` 和 `std::make_shared`，减少手动管理资源的机会。

最终，学习智能指针最重要的不是记住几个类和函数，而是建立一种思维方式：

**在编写代码之前，先明确资源由谁拥有、何时销毁，以及其他对象是否需要共同决定它的生命周期。**

当这些关系能够通过类型清楚表达时，代码通常会更安全、更容易维护，也更符合现代 C++ 的设计理念。
