---
title: "LevelDB源码学习: 调试环境"
date: '2026-11-05T17:36:38+08:00'
draft: false
tags: [LevelDB, C++, CMake, LLDB, 源码阅读]
categories: [数据库]
---

# 一、为什么选择 LevelDB

[LevelDB](https://github.com/google/leveldb) 是 Google 开源的一款高性能嵌入式 Key-Value 存储引擎，使用 C++ 编写。它提供有序的键值映射，支持基本的 Put、Get、Delete 操作，同时支持批量写入、快照、迭代器以及数据压缩。

LevelDB 虽然不是一个完整的关系型数据库，但它的实现涉及很多值得深入学习的系统编程技术：

- **LSM-Tree：** 理解日志结构合并树的基本设计思想。
- **WAL：** 理解预写日志如何保证写入的持久性。
- **MemTable：** 理解内存中的有序数据结构及其实现。
- **SSTable：** 理解磁盘上的有序数据组织方式。
- **Compaction：** 理解后台数据合并、磁盘空间回收和读写放大的权衡。
- **Cache：** 理解缓存设计及引用计数。
- **并发控制：** 理解互斥锁、条件变量和后台任务调度。
    
相比从零开始阅读一个大型数据库，LevelDB 的代码规模相对适中，非常适合作为深入学习存储引擎的起点。

本文以 Apple Silicon Mac（M 系列芯片）为例，搭建一套可以进行源码阅读、单步调试、单元测试和性能测试的开发环境。

# 二、环境准备

## 2.1 开发环境

本文使用以下工具：

| 工具 | 用途 |
|---|---|
| macOS | 开发操作系统 |
| Apple Clang | C/C++ 编译器 |
| CMake | 项目构建系统 |
| Ninja | 可选的构建后端 |
| LLDB | 源码级调试器 |
| Git | 源码版本管理 |
| VS Code | 代码阅读和编辑 |

LevelDB 当前主线要求 C++17，CMake 工程要求 CMake 3.22 或更新版本。因此，需要提前准备合适的工具链。

## 2.2 安装 Xcode Command Line Tools

macOS 可以直接使用 Apple 提供的 Clang 工具链。

执行：

```bash
xcode-select --install
```

安装完成后检查：

```bash
clang --version
clang++ --version
lldb --version
```

检查编译器是否正常：

```bash
cat > hello.cpp <<'EOF'
#include <iostream>

int main() {
    std::cout << "Hello LevelDB!" << std::endl;
    return 0;
}
EOF

clang++ -std=c++17 hello.cpp -o hello
./hello
```

正常情况下输出：

```text
Hello LevelDB!
```

这里使用 Apple Clang 即可，不需要为了学习 LevelDB 特意安装 GCC。

## 2.3 安装 CMake 和 Ninja

推荐使用 Homebrew：

```bash
brew install cmake ninja
```

检查版本：

```bash
cmake --version
ninja --version
```

其中：

- CMake 负责读取项目中的 `CMakeLists.txt`，生成构建系统。
- Ninja 负责根据生成的构建文件执行编译任务。

当然，也可以直接使用 CMake 默认的 Unix Makefiles，不强制要求 Ninja。

## 2.4 创建源码目录

建议将源码、构建产物和自己的测试程序分开管理：

```text
~/minghan/cs/src/
├── leveldb/
│   ├── db/
│   ├── table/
│   ├── util/
│   ├── include/
│   ├── helpers/
│   ├── third_party/
│   ├── CMakeLists.txt
│   └── ...
│
└── leveldb-playground/
    ├── CMakeLists.txt
    ├── examples/
    └── build/
```

其中：

- `leveldb/`：LevelDB 官方源码，不建议随意修改项目结构。
- `leveldb-playground/`：自己的实验代码，用来编写测试程序和验证想法。

这样既方便跟踪官方仓库的更新，也方便独立编写自己的实验程序。

# 三、获取 LevelDB 源码

## 3.1 克隆官方仓库

LevelDB 官方仓库：

https://github.com/google/leveldb

使用下面的命令获取源码：

```bash
cd ~/minghan/cs/src

git clone --recurse-submodules \
    https://github.com/google/leveldb.git

cd leveldb
```

这里需要特别注意 `--recurse-submodules`。

LevelDB 使用 Git Submodule 管理部分第三方依赖，主要包括：

- `third_party/googletest`：Google Test 和 Google Mock，用于单元测试。
- `third_party/benchmark`：Google Benchmark，用于性能测试。

如果仅仅执行：

```bash
git clone https://github.com/google/leveldb.git
```

可能只会得到子模块目录，而不会获取其中的实际源码。

随后执行 CMake，就可能遇到：

```text
CMake Error at CMakeLists.txt:303 (add_subdirectory):

The source directory
third_party/googletest
does not contain a CMakeLists.txt file.
```

或者：

```text
The source directory
third_party/benchmark
does not contain a CMakeLists.txt file.
```

这并不是编译器或者 CMake 本身的问题，而是第三方依赖没有初始化。

如果已经克隆了仓库，也不需要重新下载，直接执行：

```bash
git submodule update --init --recursive
```

检查子模块：

```bash
git submodule status
```

正常情况下，子模块状态前面不应该出现 `-`。

还可以直接检查：

```bash
test -f third_party/googletest/CMakeLists.txt \
    && echo "googletest OK"

test -f third_party/benchmark/CMakeLists.txt \
    && echo "benchmark OK"
```

## 3.2 查看源码版本

获取源码后，建议记录当前学习的版本：

```bash
git log -1 --oneline
git describe --tags --always
git status
```

如果学习过程中需要修改源码，可以创建自己的分支：

```bash
git switch -c study-leveldb
```

这样可以方便地记录实验过程，也能避免自己的修改与官方代码混在一起。

**一个建议：** 阅读源码时尽量固定一个 Git Commit，不要频繁切换版本。不同版本之间的内部实现可能存在差异，固定版本更有利于建立完整的代码理解。

# 四、使用 CMake 构建 LevelDB

LevelDB 官方使用 CMake 作为构建系统，仓库根目录下的 `CMakeLists.txt` 定义了编译选项、目标和测试规则。

当前主线使用 C++17。

## 4.1 理解 CMake 构建选项

首先了解几个重要的 CMake 选项：

| 选项 | 默认值 | 作用 |
|---|---|---|
| `LEVELDB_BUILD_TESTS` | ON | 是否编译单元测试 |
| `LEVELDB_BUILD_BENCHMARKS` | ON | 是否编译性能测试 |
| `LEVELDB_INSTALL` | ON | 是否生成安装规则 |
| `BUILD_SHARED_LIBS` | OFF | 是否构建共享库 |

对于源码学习，我建议：

- 保留单元测试。
- 保留 Benchmark。
- 使用 Debug 构建。
- 生成独立的构建目录。

这样可以在不影响源码目录的情况下，同时维护 Debug 和 Release 两套构建结果。

## 4.2 Debug 构建

首先进入 LevelDB 根目录：

```bash
cd ~/minghan/cs/src/leveldb
```

创建 Debug 构建目录：

```bash
cmake -S . -B build-debug \
    -G Ninja \
    -DCMAKE_BUILD_TYPE=Debug \
    -DCMAKE_EXPORT_COMPILE_COMMANDS=ON \
    -DLEVELDB_BUILD_TESTS=ON \
    -DLEVELDB_BUILD_BENCHMARKS=ON
```

参数说明：

- `-S .`：指定源码目录。
- `-B build-debug`：指定构建目录。
- `-G Ninja`：使用 Ninja 生成构建文件。
- `CMAKE_BUILD_TYPE=Debug`：启用 Debug 构建配置。
- `CMAKE_EXPORT_COMPILE_COMMANDS=ON`：生成 `compile_commands.json`。
- `LEVELDB_BUILD_TESTS=ON`：构建单元测试。
- `LEVELDB_BUILD_BENCHMARKS=ON`：构建性能测试。

其中 `compile_commands.json` 非常有用。它记录了每个源文件实际使用的编译命令，可以帮助 VS Code、clangd 等工具理解项目的编译环境。

执行编译：

```bash
cmake --build build-debug \
    --parallel $(sysctl -n hw.ncpu)
```

也可以指定具体目标：

```bash
cmake --build build-debug --target leveldb
```

编译完成后，可以检查：

```bash
find build-debug -name "*.a"
find build-debug -name "leveldb_tests"
find build-debug -name "db_bench"
```

默认情况下会生成静态库 `libleveldb.a`，以及测试和 Benchmark 程序。

## 4.3 Release 构建

除了 Debug 构建，建议额外准备一套 Release 环境。

```bash
cmake -S . -B build-release \
    -G Ninja \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_EXPORT_COMPILE_COMMANDS=ON \
    -DLEVELDB_BUILD_TESTS=ON \
    -DLEVELDB_BUILD_BENCHMARKS=ON
```

编译：

```bash
cmake --build build-release \
    --parallel $(sysctl -n hw.ncpu)
```

两套构建目录互不影响：

```text
leveldb/
├── build-debug/
│   ├── build.ninja
│   ├── compile_commands.json
│   └── ...
│
├── build-release/
│   ├── build.ninja
│   ├── compile_commands.json
│   └── ...
│
└── ...
```

为什么要保留两套环境？

Debug 版本主要用于：

- 设置断点。
- 查看局部变量。
- 跟踪函数调用。
- 分析数据结构。
- 调试单元测试。

Release 版本主要用于：

- 性能测试。
- Benchmark。
- 观察优化后的执行行为。

注意：Debug 和 Release 的执行性能差异可能很大，不能直接使用 Debug 构建结果评价 LevelDB 的实际性能。

## 4.4 不需要测试时的构建方式

如果只是想将 LevelDB 集成到自己的项目中，可以关闭测试和 Benchmark：

```bash
cmake -S . -B build \
    -DCMAKE_BUILD_TYPE=Release \
    -DLEVELDB_BUILD_TESTS=OFF \
    -DLEVELDB_BUILD_BENCHMARKS=OFF

cmake --build build -j$(sysctl -n hw.ncpu)
```

但是，如果目的是深入学习源码，我不建议关闭测试。

LevelDB 的测试代码本身就是非常重要的学习材料。

# 五、运行测试与 Benchmark

编译成功并不意味着环境已经完全正常。还需要通过测试程序验证。

## 5.1 运行全部单元测试

LevelDB 使用 Google Test 编写单元测试。

执行：

```bash
ctest --test-dir build-debug --output-on-failure
```

其中：

- `--test-dir`：指定 CTest 的构建目录。
- `--output-on-failure`：只在测试失败时输出详细信息。

如果全部通过，说明当前构建环境基本正常。

也可以直接运行测试二进制：

```bash
./build-debug/leveldb_tests
```

Google Test 支持通过过滤器运行指定测试：

```bash
./build-debug/leveldb_tests \
    --gtest_filter="DBTest.*"
```

例如：

```bash
./build-debug/leveldb_tests \
    --gtest_filter="DBTest.Recover*"
```

具体测试名称可以先查看：

```bash
./build-debug/leveldb_tests --gtest_list_tests
```

## 5.2 认识 LevelDB 的测试组织

建议优先阅读以下测试：

| 测试文件 | 学习内容 |
|---|---|
| `db/db_test.cc` | 数据库整体行为 |
| `db/version_set_test.cc` | Version 和 VersionSet |
| `db/write_batch_test.cc` | 批量写入 |
| `db/log_test.cc` | WAL 日志 |
| `db/skiplist_test.cc` | SkipList |
| `table/table_test.cc` | SSTable |
| `util/cache_test.cc` | LRU Cache |
| `util/bloom_test.cc` | Bloom Filter |

不要一开始就试图阅读全部测试代码。

更有效的方法是：先理解一个功能的测试用例，再跟踪对应的实现。

例如，研究写入功能时，可以先找到 `DBTest` 中的写入测试，再追踪 `DBImpl::Write()`。

## 5.3 运行 Benchmark

LevelDB 提供 `db_bench`，用于测试数据库的读写性能。

执行：

```bash
./build-release/db_bench \
    --benchmarks=fillseq,readseq,readrandom
```

常见测试项目：

| Benchmark | 含义 |
|---|---|
| `fillseq` | 按顺序写入 |
| `fillrandom` | 随机写入 |
| `readseq` | 顺序读取 |
| `readrandom` | 随机读取 |
| `readreverse` | 逆序读取 |
| `overwrite` | 覆盖写入 |
| `deleteseq` | 顺序删除 |
| `deleterandom` | 随机删除 |

如果需要控制数据规模：

```bash
./build-release/db_bench \
    --num=100000 \
    --benchmarks=fillseq,readseq,readrandom
```

这里的 `--num` 表示操作使用的记录数量。

需要注意，Benchmark 结果受磁盘、缓存、数据规模、压缩策略以及编译优化等因素影响。不同机器之间的结果不宜直接比较。

# 六、使用 LLDB 调试 LevelDB 源码

源码学习最重要的环节是调试。

仅仅通过阅读代码，很难完整理解一次数据库操作究竟经过了哪些模块。借助 LLDB，可以从公开 API 进入内部实现，逐层跟踪函数调用。

## 6.1 检查 Debug 符号

首先检查构建产物：

```bash
file build-debug/leveldb_tests
```

再查看编译命令：

```bash
grep -m 1 "db_impl.cc" \
    build-debug/compile_commands.json
```

Debug 构建通常会包含 `-g`，同时不会启用 Release 级别的优化。

对于源码调试，推荐：

```text
-DCMAKE_BUILD_TYPE=Debug
```

如果需要明确控制优化级别，也可以在 Debug 配置中加入：

```bash
-DCMAKE_CXX_FLAGS_DEBUG="-g -O0"
```

`-O0` 可以减少优化导致的变量消失、代码重排和函数内联问题。

## 6.2 启动 LLDB

直接使用 LLDB 启动测试程序：

```bash
lldb -- ./build-debug/leveldb_tests
```

进入 LLDB 后：

```lldb
(lldb) breakpoint set --name leveldb::DBImpl::Write
(lldb) run --gtest_filter=DBTest.Empty
```

如果当前构建版本中的符号名称存在差异，可以先搜索：

```lldb
(lldb) image lookup -rn 'DBImpl.*Write'
```

也可以使用源码行号设置断点：

```lldb
(lldb) breakpoint set --file db_impl.cc --line 200
```

这里的行号只是示例，实际使用时应根据当前源码定位。

常用 LLDB 命令：

| 命令 | 作用 |
|---|---|
| `b function` | 设置函数断点 |
| `b file:line` | 设置文件行号断点 |
| `run` | 启动程序 |
| `n` | 单步执行，不进入函数 |
| `s` | 单步进入函数 |
| `finish` | 执行到当前函数返回 |
| `bt` | 查看调用栈 |
| `frame variable` | 查看当前栈帧变量 |
| `p variable` | 打印变量 |
| `thread backtrace all` | 查看所有线程调用栈 |
| `continue` | 继续执行 |
| `quit` | 退出调试器 |

## 6.3 使用 VS Code 调试

如果习惯使用 VS Code，可以安装 C/C++ 扩展。

打开 LevelDB 源码目录，创建 `.vscode/launch.json`：

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug LevelDB Tests",
            "type": "cppdbg",
            "request": "launch",
            "program": "${workspaceFolder}/build-debug/leveldb_tests",
            "args": [
                "--gtest_filter=DBTest.Empty"
            ],
            "cwd": "${workspaceFolder}",
            "MIMode": "lldb",
            "stopAtEntry": false,
            "externalConsole": false
        }
    ]
}
```

注意：

1. 需要安装 VS Code C/C++ 扩展。
2. `program` 应该指向实际生成的测试程序。
3. `args` 可以指定 Google Test 的过滤器。
4. 调试器需要使用本机可用的 LLDB。

如果 VS Code 找不到 LLDB，可以先在终端执行：

```bash
which lldb
```

再根据实际路径调整调试器配置。

如果只是进行源码级调试，我更推荐先熟悉命令行 LLDB。命令行方式更加直接，也更方便理解断点、线程和调用栈。

# 七、编写自己的 LevelDB 实验程序

只阅读官方测试还不够，建议自己编写一个简单的数据库程序，观察公开 API 如何进入内部实现。

## 7.1 编写测试程序

在独立的实验目录中创建：

```text
leveldb-playground/
├── CMakeLists.txt
├── main.cpp
└── build/
```

`main.cpp`：

```cpp
#include <iostream>
#include <memory>
#include <string>

#include "leveldb/db.h"
#include "leveldb/options.h"
#include "leveldb/slice.h"
#include "leveldb/status.h"

int main() {
    leveldb::DB* db = nullptr;

    leveldb::Options options;
    options.create_if_missing = true;

    const std::string path = "./testdb";

    leveldb::Status status =
        leveldb::DB::Open(options, path, &db);

    if (!status.ok()) {
        std::cerr << "Open failed: "
                  << status.ToString() << '\n';
        return 1;
    }

    std::unique_ptr<leveldb::DB> database(db);

    // Write
    status = database->Put(
        leveldb::WriteOptions(),
        "name",
        "LevelDB"
    );

    if (!status.ok()) {
        std::cerr << "Put failed: "
                  << status.ToString() << '\n';
        return 1;
    }

    // Read
    std::string value;

    status = database->Get(
        leveldb::ReadOptions(),
        "name",
        &value
    );

    if (!status.ok()) {
        std::cerr << "Get failed: "
                  << status.ToString() << '\n';
        return 1;
    }

    std::cout << "Value: " << value << '\n';

    // Delete
    status = database->Delete(
        leveldb::WriteOptions(),
        "name"
    );

    if (!status.ok()) {
        std::cerr << "Delete failed: "
                  << status.ToString() << '\n';
        return 1;
    }

    return 0;
}
```

这里使用 `std::unique_ptr` 管理 DB 对象，避免忘记释放资源。

## 7.2 编写 CMakeLists.txt

为了避免手动处理 LevelDB 的静态库依赖，推荐直接通过 `add_subdirectory()` 将 LevelDB 源码作为子项目加入自己的实验工程。

`CMakeLists.txt`：

```cmake
cmake_minimum_required(VERSION 3.22)

project(leveldb_playground LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# LevelDB 源码目录
add_subdirectory(
    ../leveldb
    ${CMAKE_BINARY_DIR}/leveldb
    EXCLUDE_FROM_ALL
)

add_executable(leveldb_demo main.cpp)

target_link_libraries(
    leveldb_demo
    PRIVATE leveldb
)
```

这里假设两个目录是同级目录：

```text
src/
├── leveldb/
└── leveldb-playground/
```

配置并构建：

```bash
cmake -S . -B build \
    -G Ninja \
    -DCMAKE_BUILD_TYPE=Debug \
    -DLEVELDB_BUILD_TESTS=OFF \
    -DLEVELDB_BUILD_BENCHMARKS=OFF

cmake --build build
```

运行：

```bash
./build/leveldb_demo
```

预期输出：

```text
Value: LevelDB
```

此时可以在自己的程序中设置断点，跟踪公开 API 进入 LevelDB 内部实现的完整过程。

这种方式也非常适合后续修改 LevelDB 源码并观察行为变化。

# 八、如何开始阅读 LevelDB 源码

环境搭建完成后，真正的问题是：从哪里开始阅读？

我不建议按照目录顺序从头到尾阅读 LevelDB。更好的方法是围绕一条完整的数据流展开。

## 8.1 先建立整体架构认识

LevelDB 的核心设计思想是 LSM-Tree。

可以先建立下面这张简化的结构图：

```text
             Client
                |
                v
           Public API
                |
                v
              DBImpl
                |
       +--------+--------+
       |                 |
       v                 v
     Write              Read
       |                 |
       v                 v
      WAL              MemTable
       |                 |
       v                 v
    MemTable          Immutable
       |                 |
       v                 v
   Background         SSTable
    Flush                |
       |                 |
       +--------+--------+
                |
                v
             Version
                |
                v
          SSTable Files
                |
                v
            Compaction
```

这只是帮助理解的概念图，不代表所有操作都严格按照这张图中的单一顺序执行。

特别是读取操作还会涉及 Immutable MemTable、多个 SSTable、Bloom Filter 和 Block Cache。

建议先阅读：

- `doc/index.md`
- `doc/impl.md`
- `include/leveldb/db.h`
- `db/db_impl.h`
- `db/db_impl.cc`

## 8.2 第一阶段：从 DB::Open 开始

首先理解数据库如何打开。

建议追踪：

```text
leveldb::DB::Open()
        |
        v
    DBImpl::Open()
        |
        v
   DBImpl 初始化
        |
        v
    恢复数据库状态
        |
        v
    创建 DB 实例
```

重点关注：

- DB 对象如何创建？
- 如何判断数据库是否存在？
- 如何恢复已有数据库？
- 如何恢复日志？
- VersionSet 在哪里初始化？
- MemTable 在哪里创建？

这一阶段主要理解数据库启动和恢复机制。

## 8.3 第二阶段：追踪一次 Put 操作

这是最值得深入研究的一条路径。

从用户调用：

```cpp
db->Put(write_options, key, value);
```

开始，追踪：

```text
DB::Put()
    |
    v
DBImpl::Put()
    |
    v
WriteBatch
    |
    v
DBImpl::Write()
    |
    +-------------------+
    |                   |
    v                   v
   WAL              MemTable
    |                   |
    v                   v
日志写入             内存更新
    |                   |
    +---------+---------+
              |
              v
          Write 完成
```

需要特别注意：

1. `Put()` 本身只是一个方便的公开接口。
2. `WriteBatch` 负责组织一批写操作。
3. `DBImpl::Write()` 是写入路径的核心。
4. WAL 负责记录需要持久化的更新。
5. MemTable 负责提供内存中的有序数据访问。

这里有一个非常值得思考的问题：

**为什么 LevelDB 需要先写 WAL，再更新 MemTable？**

建议结合 `WriteOptions::sync`、日志写入、`WriteBatch` 和 MemTable 更新逻辑理解写入的持久性和原子性。

## 8.4 第三阶段：追踪 Get 操作

从：

```cpp
db->Get(read_options, key, &value);
```

开始追踪读取路径。

重点关注：

- `DBImpl::Get()`
- MemTable 查询
- Immutable MemTable 查询
- Version 查询
- TableCache
- BlockCache
- SSTable 查找

需要理解：为什么 LevelDB 读取数据时，不是简单地从一个文件中查找？

因为数据可能同时存在于内存表和多个磁盘文件中，而且不同层级的数据可能存在覆盖关系。

## 8.5 第四阶段：研究后台 Compaction

当 MemTable 达到一定大小后，LevelDB 会将其转换为磁盘上的 SSTable。

与此同时，LevelDB 还需要通过 Compaction 整理不同层级的文件。

重点关注：

```text
MemTable
    |
    v
Immutable MemTable
    |
    v
Flush
    |
    v
SSTable
    |
    v
VersionSet
    |
    v
Compaction
    |
    v
新的 SSTable
```

建议阅读：

- `db/db_impl.cc`
- `db/db_impl.h`
- `db/version_set.cc`
- `db/version_set.h`
- `db/builder.cc`
- `table/table_builder.cc`

重点理解：

- 什么情况下触发 Compaction？
- 如何选择需要合并的文件？
- 如何处理重复 Key？
- 如何处理 Delete 操作产生的墓碑？
- Compaction 如何更新 Version？
- 旧 SSTable 什么时候可以删除？

这一阶段是理解 LevelDB 存储引擎设计的关键。

## 8.6 第五阶段：深入底层数据结构

最后再研究各个底层组件：

| 组件 | 重点文件 | 学习内容 |
|---|---|---|
| SkipList | `db/skiplist.h` | 跳表及并发读写 |
| MemTable | `db/memtable.cc` | 内存数据组织 |
| WAL | `db/log_writer.cc`、`db/log_reader.cc` | 日志格式与恢复 |
| SSTable | `table/table_builder.cc`、`table/table.cc` | 磁盘数据组织 |
| Bloom Filter | `util/bloom.cc` | 概率型数据结构 |
| Cache | `util/cache.cc` | LRU 缓存 |
| VersionSet | `db/version_set.cc` | 文件版本管理 |

不要试图同时理解所有组件。

应该沿着一条数据流逐步深入，遇到不理解的数据结构时再进入对应实现。

# 九、源码阅读与调试技巧

除了 LLDB，下面这些工具和方法也非常值得掌握。

## 9.1 使用 rg 搜索函数定义

推荐安装 ripgrep：

```bash
brew install ripgrep
```

搜索函数：

```bash
rg "DBImpl::Write" db/
```

搜索类定义：

```bash
rg "class MemTable" db/
```

搜索某个成员变量：

```bash
rg "imm_" db/
```

搜索函数调用：

```bash
rg "MakeRoomForWrite" db/
```

## 9.2 使用 ctags 建立代码索引

安装：

```bash
brew install universal-ctags
```

生成索引：

```bash
ctags -R .
```

之后可以借助编辑器跳转到函数定义。

如果使用 VS Code，也可以使用 clangd 扩展，配合 `compile_commands.json` 实现更准确的代码跳转、补全和引用查找。

## 9.3 使用 git blame 理解代码演进

当遇到难以理解的实现时，不妨查看代码的历史：

```bash
git blame db/db_impl.cc
```

查看某个函数的历史：

```bash
git log -p -S"MakeRoomForWrite" -- db/db_impl.cc
```

这有助于理解：

- 某个设计为什么出现？
- 某个实现解决了什么问题？
- 为什么没有采用更简单的方案？

## 9.4 不要只设置函数断点

推荐采用以下调试过程：

1. 找到公开 API。
2. 找到内部实现。
3. 找到关键状态变量。
4. 设置断点。
5. 单步进入关键函数。
6. 查看调用栈。
7. 观察数据结构变化。
8. 对照测试用例验证自己的理解。

例如研究 `DBImpl::Write()`，不要只看函数入口和出口，而是重点观察：

- WriteBatch 的内容。
- Writer 队列。
- WAL 写入位置。
- MemTable 的引用。
- Sequence Number 的变化。

这样才能真正理解一次写入操作。

# 十、推荐的学习路线

如果目标是深入掌握 LevelDB，我建议分为四个阶段。

## 阶段一：理解基本使用和架构

目标：能够使用 LevelDB，并理解 LSM-Tree 的基本设计。

任务：

- 编译 LevelDB。
- 运行所有单元测试。
- 编写简单的 Put/Get/Delete 程序。
- 理解 DB、Options、Status、Slice。
- 阅读 `doc/impl.md`。

## 阶段二：理解读写路径

目标：能够独立追踪一次读写操作。

任务：

- 追踪 DB::Open。
- 追踪 DBImpl::Write。
- 追踪 DBImpl::Get。
- 理解 WriteBatch。
- 理解 WAL。
- 理解 MemTable。

建议在每条调用链上至少设置一次断点，并记录关键状态的变化。

## 阶段三：理解磁盘存储和后台任务

目标：理解数据如何从内存进入磁盘，以及磁盘文件如何组织。

任务：

- 阅读 SSTable 格式。
- 理解 Block 和 BlockHandle。
- 理解 TableBuilder。
- 理解 Version 和 VersionSet。
- 追踪 Flush。
- 追踪 Compaction。

## 阶段四：动手修改和实验

目标：从代码阅读过渡到真正理解设计。

建议完成以下实验：

| 实验 | 目标 |
|---|---|
| 修改 MemTable 写入逻辑 | 理解内存数据结构 |
| 修改 Bloom Filter 参数 | 理解空间与误判率 |
| 调整 BlockCache 容量 | 观察缓存对读取性能的影响 |
| 调整 WriteBufferSize | 观察 Flush 频率变化 |
| 修改 Compaction 相关参数 | 观察读写放大和空间放大 |
| 追踪 WAL 恢复过程 | 理解故障恢复 |

每次实验建议记录：

1. 修改了什么？
2. 为什么修改？
3. 预期结果是什么？
4. 实际结果是什么？
5. 是否影响已有测试？
6. 对性能产生了什么影响？

不要只看 Benchmark 数字，还要结合源码解释数字变化的原因。

# 十一、总结

在 Mac M4 上学习 LevelDB，不需要复杂的交叉编译环境，也不需要额外搭建 Linux 虚拟机。使用 Apple Clang、CMake 和 LLDB，就可以完成源码构建、测试和调试。

对于源码学习而言，最重要的并不是把所有文件读一遍，而是建立一条完整的理解路径：

```text
公开 API
   |
   v
DBImpl
   |
   v
读写路径
   |
   v
MemTable / WAL
   |
   v
SSTable
   |
   v
VersionSet
   |
   v
Compaction
```

建议始终坚持一个原则：

**以实际操作为入口，以单元测试为验证，以 LLDB 为工具，以数据结构和状态变化为核心。**

当你能够独立追踪一次 Put、Get、Flush 和 Compaction 的完整执行过程时，才算真正开始理解 LevelDB。