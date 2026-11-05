---
title: "关于Git的一切"
date: '2026-11-05T20:23:00+08:00'
draft: false
tags: [Git, 版本控制]
categories: [工程实践]
---

# 一、为什么需要版本控制？

## 1.1 从一个实际问题出发

假设你正在开发一个 C++ 项目。

第一天，你实现了一个内存池，代码能够正常运行。第二天，你尝试优化内存分配算法，修改了大量代码。第三天，你发现优化后的版本存在严重的内存泄漏，而且已经无法确定究竟修改了哪些地方。

你可能会想到一个简单的办法：定期复制整个项目。

于是出现了这样的目录：

```text
memory-pool/
memory-pool-old/
memory-pool-new/
memory-pool-new2/
memory-pool-final/
memory-pool-final-v2/
memory-pool-final-really/
```

这种方法很快就会暴露出问题：

1. **无法准确追踪变化**：不知道某个文件究竟修改了什么。
2. **难以回退**：想恢复某个功能，需要找到正确的历史目录。
3. **无法有效协作**：多个人修改同一个项目，很难安全地合并各自的工作。
4. **缺乏责任追踪**：不知道是谁、在什么时候、因为什么原因修改了代码。
5. **无法建立可靠的发布流程**：难以确定某个版本究竟对应哪些代码。

这些问题实际上指向了软件开发中的一个基础需求：

**我们需要一种机制，能够记录项目随时间发生的变化，并允许我们查询、比较、恢复和协作。**

这就是版本控制系统（Version Control System，VCS）存在的原因。

## 1.2 版本控制系统解决什么问题？

版本控制系统的核心职责可以概括为四件事。

### 1. 记录历史

每次提交（Commit）都记录一次有意义的项目状态变化。

例如：

```text
commit 1: 初始化项目
commit 2: 实现内存分配器
commit 3: 添加线程安全支持
commit 4: 修复内存泄漏
commit 5: 优化空闲链表
```

我们可以随时查看历史记录：

```bash
git log --oneline
```

也可以查看某次提交具体修改了什么：

```bash
git show <commit-id>
```

### 2. 比较和回退

版本控制系统能够比较两个版本之间的差异。

```bash
git diff
git diff HEAD~1 HEAD
```

当某次修改引入了 Bug，可以恢复到之前的状态，或者创建一个新的提交来撤销错误修改。

这使得软件开发从不可逆的文件修改过程，变成了可以安全探索和试错的过程。

### 3. 并行开发

假设一个团队有三名开发人员：

- A：开发内存分配器。
- B：开发线程池。
- C：修复网络模块的 Bug。

如果大家直接修改同一份代码，工作很容易互相干扰。

版本控制系统允许每个人在独立的开发分支上工作：

```text
                  feature/memory-pool
                 /
main ------------+-------------------
                 \
                  feature/thread-pool
```

开发人员可以独立提交代码，最终再将各自的修改整合到主分支。

### 4. 协作与审计

版本控制系统不仅记录代码，还记录代码变更背后的信息：

- 作者是谁？
- 什么时候修改的？
- 修改了哪些内容？
- 为什么要修改？
- 经过了哪些代码评审？
- 最终进入了哪个发布版本？

这对于多人协作、问题排查、安全审计和软件维护非常重要。

## 1.3 版本控制的本质

从更抽象的角度来看，版本控制系统维护的是一个不断演进的项目历史。

它需要解决三个核心问题：

1. **状态表示**：如何表示某个时刻的项目内容？
2. **历史组织**：如何组织不同时间产生的项目版本？
3. **协作合并**：如何整合不同开发人员产生的修改？

不同版本控制系统的主要区别，实际上就是对这三个问题采取了不同的设计方案。

---

# 二、版本控制系统的发展，以及 Git 为什么脱颖而出？

版本控制系统并不是一开始就采用 Git 这样的分布式架构。

它经历了从本地版本控制、集中式版本控制到分布式版本控制的发展过程。

## 2.1 本地版本控制系统

最早期的版本控制主要解决个人开发过程中的文件历史管理问题。

典型代表是 RCS（Revision Control System）。

RCS 将文件的不同版本保存在本地，通过记录文件的变化来管理历史。

例如：

```text
hello.c
hello.c,v
```

开发者可以查看文件历史、比较版本以及恢复之前的版本。

这种方案相比手工复制文件已经有了很大进步，但它存在明显限制：

- 主要面向单个文件。
- 缺少完善的项目级协作机制。
- 多人同时开发时，协调成本较高。
- 历史数据主要保存在个人机器上。

它适合个人开发，却难以满足大型团队的软件开发需求。

## 2.2 集中式版本控制系统（CVCS）

随着软件项目规模扩大，多人协作逐渐成为常态。

集中式版本控制系统由此出现。

典型代表：

- CVS（Concurrent Versions System）：早期经典的集中式版本控制系统，基于文件进行版本管理。
- SVN（Apache Subversion）：广泛应用于企业开发的集中式版本控制系统，支持目录级版本管理、分支和标签。
- Perforce Helix Core：面向大型软件开发和游戏开发的版本控制系统，支持大规模二进制文件管理和细粒度权限控制。

其基本架构如下：

```text
                 Central Server
                (Repository)
                      |
          +-----------+-----------+
          |           |           |
       Client A    Client B    Client C
```

所有开发人员共享一个中央仓库。

通常的工作流程是：

1. 从中央服务器获取代码。
2. 在本地修改文件。
3. 将修改提交到中央服务器。
4. 其他开发人员更新代码，获取最新修改。

### 集中式版本控制的优点

**第一，管理简单。**

所有版本历史集中保存在服务器上，管理员可以统一管理权限、备份和代码提交。

**第二，协作模型直观。**

大家围绕一个中央仓库进行开发，容易建立统一的代码管理流程。

**第三，权限控制比较成熟。**

可以针对不同目录、文件或者分支配置访问权限。

### 集中式版本控制的缺点

**1. 对中央服务器依赖较强。**

服务器不可用时，开发人员通常无法正常提交代码，也无法访问完整的版本历史。

**2. 网络依赖明显。**

很多版本控制操作需要与服务器通信。

**3. 分支操作成本相对较高。**

在传统集中式系统中，分支管理通常需要更多服务器端操作和协调。

**4. 本地历史能力有限。**

本地工作副本通常并不包含完整的项目历史，离线进行历史查询和版本管理受到限制。

集中式版本控制很好地解决了多人协作问题，但它仍然存在一个核心限制：

**开发人员的本地机器并不是一个完整的版本仓库。**

## 2.3 分布式版本控制系统（DVCS）

分布式版本控制系统改变了这个设计。

典型代表：
- Git：由 Linus Torvalds 于 2005 年创建，采用内容寻址的对象数据库和快照模型，以轻量级分支、快速本地操作和强大的合并能力著称。
- Mercurial（Hg）：与 Git 同属分布式版本控制系统，强调易用性和一致的命令接口，也曾广泛应用于大型软件项目。

它的基本架构如下：

```text
                Remote Repository
                       |
             +---------+---------+
             |         |         |
          Clone A   Clone B   Clone C
             |         |         |
          Local     Local     Local
          Repo      Repo      Repo
```

每个开发人员通过 `clone` 获取一个完整的仓库副本。

这意味着：

- 每个人都拥有完整的项目历史。
- 大部分版本控制操作可以在本地完成。
- 可以离线提交代码。
- 可以在本地创建和合并分支。
- 可以从不同仓库之间交换提交。

这里有一个非常重要的概念：

**Git 中的远程仓库并不是唯一的权威仓库，它只是多个仓库之间进行协作和数据交换的一个节点。**

当然，实际企业项目通常仍然会约定一个中央托管仓库，作为团队协作的主要集成点。

## 2.4 Git 的诞生

Git 最初由 Linux 内核的创建者 <Entity value="Linus Torvalds" category="people" disambig="Linux kernel creator"/> 于 2005 年开发。

当时 Linux 内核项目使用 BitKeeper 进行版本管理。

由于 BitKeeper 的使用许可发生变化，Linux 内核社区需要寻找新的版本控制方案。

当时已有的版本控制工具无法很好地满足 Linux 内核项目的需求。

Linux 内核具有几个显著特点：

- 开发人员数量庞大。
- 代码规模非常大。
- 开发过程高度并行。
- 分支和补丁操作频繁。
- 对版本历史和数据完整性要求很高。

Git 的设计目标正是围绕这些需求展开的：

1. 高性能：能够快速处理大型代码仓库。
2. 分布式：每个开发者都可以拥有完整的仓库。
3. 完整性：通过内容哈希识别和验证对象。
4. 高效分支：创建和切换分支应该非常轻量。
5. 支持非线性开发：能够高效合并不同开发者的工作。

Git 最重要的设计决策之一是：

**不以传统文件差异为核心组织历史，而是以内容寻址的对象数据库和项目快照为核心组织历史。**

后面介绍 Git 实现原理时会详细解释这一点。

## 2.5 为什么 Git 脱颖而出？

Git 的成功并不是单纯因为它是分布式的，而是多种设计优势共同作用的结果。

| 特性 | 传统集中式系统 | Git |
|---|---|---|
| 仓库模型 | 中央仓库为核心 | 每个克隆都是完整仓库 |
| 离线提交 | 通常不支持 | 支持 |
| 本地历史查询 | 能力有限 | 完整支持 |
| 分支创建 | 通常相对较重 | 非常轻量 |
| 合并能力 | 依赖具体实现 | 强大的三方合并 |
| 内容完整性 | 依赖具体实现 | 内容哈希校验 |
| 协作模式 | 中央协调 | 多种分布式协作模式 |

此外，Git 还有几个重要优势：

**1. 分支成本极低**

Git 分支本质上是指向提交对象的引用，而不是复制整个项目目录。

创建一个分支通常只是创建一个引用。

**2. 本地操作速度快**

查看历史、比较文件、创建提交、切换分支等操作通常不需要网络。

**3. 完整的历史模型**

每个提交都能追溯到它的父提交，从而构成一个提交有向无环图（DAG）。

**4. 强大的生态系统**

GitHub、GitLab、Gitea 等平台建立在 Git 的基础之上，提供了代码评审、CI/CD、权限管理和项目协作能力。

需要强调的是，Git 本身是版本控制系统，而 GitHub、GitLab 是围绕 Git 构建的协作与软件交付平台，两者并不是同一个东西。

---

# 三、Git 基础知识

理解 Git 最好的方式不是记忆大量命令，而是先建立正确的概念模型。

## 3.1 Git 的三个核心区域

Git 最重要的三个本地概念是：

1. 工作区（Working Tree）。
2. 暂存区（Staging Area，也叫 Index）。
3. 本地仓库（Local Repository）。

此外，还有远程仓库（Remote Repository）。

它们之间的关系如下：

```text
       Working Tree
          工作区
             |
          git add
             |
             v
       Staging Area
          暂存区
             |
         git commit
             |
             v
       Local Repository
          本地仓库
             |
          git push
             |
             v
       Remote Repository
          远程仓库
```

### 1. 工作区

工作区就是实际进行代码开发的目录。

例如：

```text
my-project/
├── src/
│   ├── main.cpp
│   └── memory_pool.cpp
├── include/
│   └── memory_pool.h
└── CMakeLists.txt
```

你在 VS Code、CLion 或 Vim 中修改的文件，都属于工作区。

Git 可以比较工作区与暂存区之间的差异。

### 2. 暂存区

暂存区是 Git 中一个非常重要、但初学者容易忽略的概念。

执行：

```bash
git add src/memory_pool.cpp
```

并不是直接将文件提交到仓库，而是将当前文件的内容加入暂存区。

暂存区代表下一次提交准备记录的项目状态。

例如：

```text
Working Tree:
    main.cpp          修改
    memory_pool.cpp   修改
    README.md         修改

Staging Area:
    memory_pool.cpp   已暂存

Local Repository:
    上一次提交
```

执行：

```bash
git commit -m "feat: implement memory pool"
```

只有暂存区中的内容才会进入这次提交。

因此，暂存区实际上允许我们精确控制一次提交包含哪些修改。

例如，一个文件修改了 100 行，但只有其中 30 行属于当前功能，可以使用：

```bash
git add -p
```

交互式地选择需要暂存的代码片段。

这是大型项目开发中非常实用的功能。

### 3. 本地仓库

本地仓库负责保存项目的提交历史。

通常情况下，它对应项目根目录下的 `.git` 目录。

```bash
ls -la .git
```

其中保存了：

- 对象数据库。
- Git 索引。
- 分支引用。
- 标签引用。
- 仓库配置。
- HEAD 指针。

每次执行 `git commit`，Git 都会根据暂存区中的内容创建新的提交对象。

### 4. 远程仓库

远程仓库是存放在其他位置的 Git 仓库。

常见托管平台：

- GitHub
- GitLab
- Gitea
- Bitbucket

远程仓库主要用于团队成员之间交换提交。

常见操作：

```bash
git fetch
git pull
git push
```

需要特别注意：

`git fetch` 负责获取远程仓库中的对象和引用信息，但不会自动修改当前工作区。

`git pull` 则通常相当于：

```bash
git fetch
git merge
```

具体行为也可以通过配置改为 Fetch + Rebase。

## 3.2 安装和初始化 Git

macOS：

```bash
brew install git
```

Ubuntu：

```bash
sudo apt update
sudo apt install git
```

检查版本：

```bash
git --version
```

配置用户信息：

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

配置默认分支名称：

```bash
git config --global init.defaultBranch main
```

配置常用编辑器：

```bash
git config --global core.editor vim
```

查看配置：

```bash
git config --list --show-origin
```

这里需要区分：

`user.name` 和 `user.email` 是写入提交对象的身份信息，不等同于 GitHub 登录账号，也不代表身份已经经过认证。

## 3.3 创建和获取仓库

### 初始化本地仓库

```bash
mkdir git-demo
cd git-demo

git init
```

此时 Git 会在当前目录创建 `.git`。

### 克隆远程仓库

```bash
git clone https://github.com/user/project.git
```

也可以指定本地目录：

```bash
git clone https://github.com/user/project.git my-project
```

克隆操作通常会获取完整的仓库历史，并配置默认远程仓库 `origin`。

查看远程仓库：

```bash
git remote -v
```

## 3.4 基本工作流程

下面通过一个完整的例子理解 Git 的日常使用。

假设我们正在开发一个 C++ 内存池项目。

首先创建文件：

```bash
cat > main.cpp <<'EOF'
#include <iostream>

int main() {
    std::cout << "Hello Git\n";
    return 0;
}
EOF
```

查看状态：

```bash
git status
```

Git 会告诉我们 `main.cpp` 是一个未跟踪文件（Untracked）。

将其加入暂存区：

```bash
git add main.cpp
```

再次查看：

```bash
git status
```

此时文件变成了已暂存状态。

创建提交：

```bash
git commit -m "feat: initialize project"
```

查看提交历史：

```bash
git log --oneline
```

接下来修改代码：

```cpp
#include <iostream>

int main() {
    std::cout << "Hello Git\n";
    std::cout << "Version Control\n";
    return 0;
}
```

查看修改：

```bash
git diff
```

将修改加入暂存区：

```bash
git add main.cpp
```

查看暂存区中的差异：

```bash
git diff --cached
```

提交：

```bash
git commit -m "feat: add version control message"
```

至此，我们已经完成了一次完整的 Git 开发流程：

```text
修改代码
   |
   v
git status
   |
   v
git diff
   |
   v
git add
   |
   v
git diff --cached
   |
   v
git commit
   |
   v
git log
```

## 3.5 Git 的状态模型

理解文件状态比记忆命令更加重要。

Git 中常见的文件状态包括：

| 状态 | 含义 |
|---|---|
| Untracked | 未被 Git 跟踪 |
| Unmodified | 已跟踪，且没有修改 |
| Modified | 已跟踪，但工作区内容发生变化 |
| Staged | 修改已加入暂存区 |

需要注意，Modified 和 Staged 并不是互斥的。

一个文件可以同时存在已暂存的修改和未暂存的修改。

例如：

```text
main.cpp

第一次修改
    |
    v
git add
    |
    v
暂存区保存第一次修改
    |
    v
第二次修改
    |
    v
工作区与暂存区不一致
```

此时：

```bash
git diff
```

查看第二次修改。

```bash
git diff --cached
```

查看第一次修改。

这是理解 Git 暂存区最重要的一个例子。

## 3.6 查看和分析历史

Git 提供了非常丰富的历史查询能力。

### 查看完整提交记录

```bash
git log
```

### 简洁显示

```bash
git log --oneline --graph --decorate --all
```

### 查看某个文件的修改历史

```bash
git log -- src/memory_pool.cpp
```

### 查看每次提交的文件变化统计

```bash
git log --stat
```

### 查看某次提交的详细变化

```bash
git show <commit-id>
```

### 查看文件每一行的最后修改者

```bash
git blame src/memory_pool.cpp
```

`git blame` 在排查历史 Bug 时非常有用。

例如，你发现一个函数存在异常，可以通过它找到每一行代码最后由哪个提交引入，然后结合 `git show` 查看当时的修改背景。

## 3.7 Git 分支

分支是 Git 最重要的功能之一。

在传统开发中，如果想同时开发两个功能，可能需要复制两份代码。

Git 则允许我们在同一个仓库中创建多个开发分支。

### 创建分支

```bash
git branch feature/memory-pool
```

查看分支：

```bash
git branch
```

切换分支：

```bash
git switch feature/memory-pool
```

创建并切换：

```bash
git switch -c feature/thread-pool
```

### 合并分支

假设我们在 `feature/memory-pool` 分支完成了开发，需要合并到 `main`。

```bash
git switch main

git merge feature/memory-pool
```

Git 会尝试将两个分支的修改整合起来。

如果目标分支没有产生新的提交，并且当前分支直接位于目标分支的历史之后，Git 通常可以执行 Fast-forward。

否则，Git 可能创建一个新的 Merge Commit。

### 解决合并冲突

假设两个分支都修改了同一个文件的同一部分，Git 可能无法自动判断应该保留哪一个版本。

此时会出现冲突：

```cpp
<<<<<<< HEAD
int max_connections = 100;
=======
int max_connections = 200;
>>>>>>> feature/config
```

需要开发人员手动决定最终代码：

```cpp
int max_connections = 200;
```

然后：

```bash
git add config.cpp
git commit
```

注意：合并冲突并不意味着 Git 发生了错误，而是它无法自动确定开发人员期望的最终语义。

## 3.8 Merge 和 Rebase

这是 Git 中非常重要的一组概念。

假设有如下提交历史：

```text
       A---B---C  feature
      /
D----E---F        main
```

其中：

- `D`、`E` 是共同历史。
- `F` 是 main 上的新提交。
- `A`、`B`、`C` 是 feature 上的提交。

### Merge

在 feature 分支上执行：

```bash
git merge main
```

Git 会创建一个新的合并提交：

```text
       A---B---C-------M  feature
      /             /
D----E-------------F     main
```

M 有两个父提交，分别对应两条开发历史。

Merge 保留了真实的分支演进过程。

### Rebase

执行：

```bash
git rebase main
```

Git 会将 feature 上的提交重新应用到 main 的最新提交之后：

```text
D---E---F---A'---B'---C'  feature
```

注意：

A'、B'、C' 并不是原来的 A、B、C。

它们是重新应用修改后创建的新提交，拥有新的提交 ID。

### 两者的区别

| 对比 | Merge | Rebase |
|---|---|---|
| 历史结构 | 保留分支结构 | 重新组织提交顺序 |
| 是否创建新提交 | 可能创建 Merge Commit | 通常重建被变基的提交 |
| 是否改变历史 | 不重写原有提交 | 改写被变基的提交 |
| 适用场景 | 整合不同开发历史 | 整理个人开发历史 |

一个重要原则：

**不要随意 Rebase 已经共享给其他开发人员的公共提交。**

因为 Rebase 会改变提交 ID，其他开发人员可能已经基于旧历史开展工作，重写历史会造成协作问题。

## 3.9 远程仓库操作

### 添加远程仓库

```bash
git remote add origin git@github.com:user/project.git
```

### 获取远程更新

```bash
git fetch origin
```

### 推送当前分支

```bash
git push -u origin main
```

`-u` 用于设置上游分支，后续可以直接执行：

```bash
git push
git pull
```

### 拉取远程更新

```bash
git pull
```

### 查看远程分支

```bash
git branch -r
```

### 删除远程分支

```bash
git push origin --delete feature/old-feature
```

这里有两个概念需要明确：

- `origin/main`：本地保存的远程跟踪引用，表示最近一次获取到的远程 main 分支状态。
- `main`：本地分支。

它们是两个不同的引用，不会因为远程分支发生变化而自动同步。

## 3.10 Git 中的撤销操作

撤销是实际开发中非常高频的需求。

但不同撤销命令的作用范围不同，一定要理解其语义。

### 撤销工作区修改

```bash
git restore main.cpp
```

将工作区文件恢复为暂存区中的版本。

注意：这会丢弃工作区中尚未保存到其他位置的修改。

### 撤销暂存

```bash
git restore --staged main.cpp
```

将文件从暂存区移出，但保留工作区中的修改。

### 修改最近一次提交

```bash
git commit --amend
```

可以修改最近一次提交的内容或提交说明。

这通常会创建一个新的提交对象。

### Reset

```bash
git reset --soft HEAD~1
```

将当前分支移动到上一个提交，但保留暂存区和工作区的修改。

```bash
git reset --mixed HEAD~1
```

移动当前分支，重置暂存区，但保留工作区的修改。

```bash
git reset --hard HEAD~1
```

移动当前分支，同时重置暂存区和工作区。

`--hard` 可能直接丢失未保存的修改，使用前必须确认。

### Revert

```bash
git revert <commit-id>
```

Revert 不会删除或重写原有提交，而是创建一个新的提交，用来反向撤销指定提交产生的修改。

这也是企业开发中非常重要的操作。

**对于已经推送到共享分支的提交，通常优先使用 Revert，而不是 Reset 或 Rebase 重写公共历史。**

## 3.11 Git 标签

标签通常用于标记重要的项目版本。

例如：

```bash
git tag v1.0.0
```

创建带注释的标签：

```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
```

推送标签：

```bash
git push origin v1.0.0
```

推送全部标签：

```bash
git push origin --tags
```

查看标签：

```bash
git tag
```

企业项目通常使用语义化版本号：

```text
MAJOR.MINOR.PATCH

1.0.0
1.1.0
1.1.1
2.0.0
```

通常：

- MAJOR：不兼容的 API 变化。
- MINOR：向后兼容的新功能。
- PATCH：向后兼容的问题修复。

---

# 四、Git 的企业开发最佳实践

掌握 Git 命令，只能说明你会使用版本控制工具。

在工业界，真正重要的是如何通过 Git 建立可靠、高效、可审计的软件开发流程。

本节以中大型 C++、后端和基础设施软件团队为背景。

## 4.1 分支管理策略

企业团队需要首先确定分支管理策略。

常见方案有：

1. Git Flow。
2. GitHub Flow。
3. Trunk-Based Development。

### 1. Git Flow

Git Flow 是一种具有明确分支职责的开发模型。

通常包含：

| 分支 | 职责 |
|---|---|
| main | 正式发布版本 |
| develop | 日常开发集成 |
| feature/* | 新功能开发 |
| release/* | 发布准备 |
| hotfix/* | 线上紧急修复 |

其基本流程：

```text
                 feature/A
                /
main ----------+--------------------
                \          \
                 develop --- release
                              |
                              v
                             main
```

优点：

- 分支职责明确。
- 适合有固定发布周期的项目。
- 便于维护多个稳定版本。

缺点：

- 分支较多。
- 合并操作相对复杂。
- 长期存在的分支容易产生集成问题。

对于持续交付、快速迭代的互联网项目，Git Flow 有时显得过于复杂。

### 2. GitHub Flow

GitHub Flow 更加简单。

核心思想是：

- main 始终保持可部署状态。
- 每个功能使用独立分支开发。
- 通过 Pull Request 进行代码评审。
- 评审通过后合并到 main。
- 通过 CI/CD 自动执行测试和部署。

流程：

```text
main
 |
 +---- feature/login
 |          |
 |       Development
 |          |
 |       Pull Request
 |          |
 |       Code Review
 |          |
 +----------+----> main
                     |
                    CI
                     |
                   Deploy
```

适合持续集成、持续交付的团队。

### 3. Trunk-Based Development

Trunk-Based Development（主干开发）强调：

开发人员尽量频繁地将小规模修改集成到主干分支。

典型特点：

- 短生命周期开发分支。
- 频繁集成。
- 自动化测试。
- 通过 Feature Flag 控制尚未正式开放的功能。
- 避免长期存在的大型功能分支。

其目标是降低分支之间的集成成本。

### 4. 如何选择？

| 场景 | 推荐方案 |
|---|---|
| 个人项目 | main + feature |
| 小型互联网团队 | GitHub Flow |
| 持续交付团队 | Trunk-Based Development |
| 有明确版本发布周期 | Git Flow 或 Release Branch |
| 多版本维护的软件 | Release Branch + Hotfix |

我的建议是：

**不要为了使用复杂的分支模型而使用复杂的分支模型。**

现代软件团队应尽可能缩短开发分支生命周期，频繁集成，并将自动化测试作为合并的基本保障。

## 4.2 Commit 规范

Commit 是软件变更历史的基本单位。

一个好的 Commit 应该回答：

- 修改了什么？
- 为什么修改？
- 影响了哪些模块？
- 是否存在兼容性变化？

不推荐：

```text
update
fix
修改代码
test
final
```

推荐采用 Conventional Commits 规范。

基本格式：

```text
<type>(<scope>): <description>

[optional body]

[optional footer]
```

例如：

```text
feat(memory-pool): add thread-safe allocation

Implement a thread-safe memory allocator using
a per-thread cache and a global fallback allocator.

Closes #123
```

常见 type：

| 类型 | 含义 |
|---|---|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档修改 |
| refactor | 代码重构 |
| perf | 性能优化 |
| test | 测试相关 |
| build | 构建系统修改 |
| ci | CI 配置修改 |
| chore | 其他维护工作 |

对于不兼容变化，可以使用：

```text
feat(api): redesign allocator interface

BREAKING CHANGE: remove the old allocate(size) API.
```

### 一个 Commit 应该有多大？

这是一个非常重要的工程实践问题。

不推荐：

```text
commit 1: 实现整个数据库
```

也不推荐：

```text
commit 1: 修改一个变量名
commit 2: 修改一个空格
commit 3: 再修改一个空格
```

比较理想的做法是：

**一个 Commit 对应一个逻辑完整、可以独立理解的修改。**

例如：

```text
feat(storage): implement block allocator
test(storage): add allocator unit tests
fix(storage): handle allocation failure
perf(storage): reduce allocation contention
```

这样做的好处是：

- 方便 Code Review。
- 方便使用 git bisect 定位 Bug。
- 方便回退某项功能。
- 方便自动生成 Changelog。
- 让项目历史具有较高的可读性。

## 4.3 Pull Request / Merge Request

在企业开发中，通常不允许开发人员直接向 main 推送代码。

而是通过 Pull Request（PR）或 Merge Request（MR）进行代码集成。

一个标准流程：

```text
              Issue / Requirement
                       |
                       v
                  Create Branch
                       |
                       v
                  Write Code
                       |
                       v
                 Local Testing
                       |
                       v
                   Push Code
                       |
                       v
                  Create PR/MR
                       |
             +---------+---------+
             |                   |
         Code Review          CI Tests
             |                   |
             +---------+---------+
                       |
                       v
                 Approval
                       |
                       v
                    Merge
                       |
                       v
                   Deploy
```

### PR 应该包含什么？

一个规范的 PR 应包含：

1. 修改目的。
2. 具体实现方案。
3. 主要修改内容。
4. 测试方法及测试结果。
5. 潜在风险。
6. 关联 Issue。
7. 必要的截图、性能数据或设计文档。

例如：

```markdown
## What

Implement a thread-safe memory allocator.

## Why

The original allocator uses a global lock,
which introduces significant contention.

## Implementation

- Add per-thread free lists.
- Introduce a global fallback allocator.
- Add synchronization for shared pages.

## Testing

- Unit tests passed.
- Stress tests passed.
- ThreadSanitizer passed.

## Risks

Memory fragmentation may increase under
some allocation patterns.
```

### Code Review 应该关注什么？

对于 C++ 和系统软件项目，建议重点检查：

- 内存管理是否正确。
- 是否存在资源泄漏。
- 是否存在数据竞争。
- 是否存在死锁风险。
- 是否存在未定义行为。
- 错误处理是否完整。
- API 是否合理。
- 是否引入性能回退。
- 是否破坏已有接口兼容性。
- 测试是否覆盖关键边界情况。

代码评审不应该只是检查代码风格，更应该检查设计正确性和工程风险。

## 4.4 保护主分支

main 通常是团队最重要的分支。

建议启用 Branch Protection 或 Rulesets。

典型规则：

- 禁止直接 Push。
- 禁止随意删除主分支。
- 禁止未经授权的强制推送。
- 要求 PR 审批。
- 要求 CI 检查通过。
- 要求解决所有合并冲突。
- 对关键目录要求 Code Owner 审批。

例如：

```text
main branch protection

[✓] Require pull request before merging
[✓] Require approvals
[✓] Require status checks
[✓] Require conversation resolution
[✓] Block force pushes
[✓] Restrict deletions
```

对于安全敏感项目，还可以考虑：

- 强制签名提交。
- 强制签名标签。
- 限制 Release 权限。
- 对重要发布操作进行审计。

需要注意，签名提交解决的是提交来源和完整性验证问题，不等于代码本身已经通过安全审查。

## 4.5 CI/CD 与 Git 集成

现代软件开发中，Git 通常是 CI/CD 流程的入口。

每次 Push 或创建 PR，都可以自动触发构建和测试。

例如，一个 C++ 项目可以采用如下流水线：

```text
                 Git Push
                    |
                    v
               CI Pipeline
                    |
          +---------+---------+
          |         |         |
        Build     Unit Test  Static Analysis
          |         |         |
          +---------+---------+
                    |
                    v
              Integration Test
                    |
                    v
               Performance Test
                    |
                    v
                Code Review
                    |
                    v
                  Merge
                    |
                    v
                 Release
```

对于 C++ 项目，可以在 CI 中执行：

```bash
cmake -S . -B build \
    -DCMAKE_BUILD_TYPE=Release

cmake --build build -j

ctest --test-dir build --output-on-failure
```

还可以增加：

```bash
# AddressSanitizer / UndefinedBehaviorSanitizer
-fsanitize=address,undefined

# ThreadSanitizer
-fsanitize=thread

# 编译器警告
-Wall -Wextra -Wpedantic
```

不同 Sanitizer 通常需要独立的构建配置，不能简单地将所有选项混在同一个构建中。

对于 Linux 系统软件项目，还可以加入：

- 多架构编译。
- 不同 Linux 内核版本测试。
- 静态代码分析。
- 内核模块构建测试。
- QEMU 自动化启动测试。
- 性能基准测试。

Git 负责记录和传递变更，CI/CD 负责验证和交付变更。

两者共同构成现代软件工程的重要基础设施。

## 4.6 `.gitignore` 与仓库管理

并不是所有文件都应该进入 Git 仓库。

对于 C++ 项目，常见的 `.gitignore`：

```gitignore
# Build directories
build/
cmake-build-*/

# Object files
*.o
*.obj
*.a
*.so
*.dylib
*.dll
*.exe

# IDE
.idea/
.vscode/
*.swp

# Logs
*.log

# Temporary files
*.tmp

# OS
.DS_Store
Thumbs.db
```

通常不应该提交：

- 编译产物。
- 临时文件。
- IDE 的个人配置。
- 日志文件。
- 密钥和密码。
- 大型可再生数据。

但也不要盲目忽略所有配置文件。

例如：

```text
.vscode/
```

可以忽略个人工作区配置，但团队共享的格式化规则、调试配置和任务配置可能值得提交。

### 大文件如何管理？

Git 更适合管理文本源代码和相对较小的二进制资源。

如果项目需要管理大型模型、数据集、视频或者构建产物，可以考虑：

- Git LFS。
- 对象存储。
- 制品仓库。
- 独立的数据版本管理系统。

Git LFS 使用 Git 指针文件管理大文件，实际文件内容存放在独立的 LFS 存储中。

不要将数 GB 的数据集直接反复提交到普通 Git 历史中。

## 4.7 安全实践

Git 仓库很容易成为敏感信息泄漏的入口。

例如：

```cpp
const char* DATABASE_PASSWORD = "123456";
const char* API_KEY = "secret-key";
```

这些信息一旦提交，就可能永久留在仓库历史中。

即使后续删除文件，也不意味着历史中的敏感信息已经消失。

推荐实践：

1. 使用环境变量管理敏感配置。
2. 使用 Secret Manager 管理密钥。
3. 使用 `.gitignore` 排除本地密钥文件。
4. 使用 Secret Scanning 检查提交。
5. 发现泄漏后立即轮换密钥。
6. 必要时清理仓库历史。

例如：

```cpp
const char* password = std::getenv("DB_PASSWORD");
```

注意：`.gitignore` 只能阻止未跟踪文件被默认加入，并不能阻止已经被 Git 跟踪的文件继续产生修改记录。

另外，已经提交的敏感信息不能只靠删除历史解决。应当优先撤销或轮换已经暴露的凭据。

## 4.8 企业开发中的推荐工作流

对于一般的 C++、后端和系统软件团队，我更推荐以下流程：

```bash
# 1. 获取最新代码
git switch main
git pull --ff-only

# 2. 创建功能分支
git switch -c feature/memory-pool

# 3. 开发和测试
cmake --build build
ctest --test-dir build

# 4. 检查修改
git status
git diff

# 5. 提交代码
git add -p
git commit -m "feat(memory-pool): add thread-safe allocator"

# 6. 获取最新主干
git fetch origin

# 7. 整理个人分支历史（仅限尚未共享的提交）
git rebase origin/main

# 8. 推送分支
git push -u origin feature/memory-pool

# 9. 创建 PR
# 10. 等待 Code Review 和 CI
# 11. 合并到 main
```

如果团队规定使用 Merge 而不是 Rebase，则按照团队约定执行，不要自行改变共享历史。

最后，合并之后及时清理已经完成的功能分支。

---

# 五、Git 的实现原理

前面介绍了 Git 的使用方法。

现在从底层实现的角度回答几个关键问题：

1. Git 为什么可以快速创建分支？
2. Git 如何保存项目历史？
3. Git 为什么能够验证文件内容的完整性？
4. Commit 究竟保存了什么？
5. Git 如何完成分支合并？

理解这些问题，才能真正理解 Git 的设计。

## 5.1 Git 的核心设计：对象数据库

Git 并不是简单地保存每次修改产生的 Diff 文件。

它的核心是一个基于内容寻址（Content Addressable）的对象数据库。

Git 的对象数据库主要包含四种对象：

| 对象 | 作用 |
|---|---|
| Blob | 保存文件内容 |
| Tree | 保存目录结构 |
| Commit | 保存一次提交及其元数据 |
| Tag | 保存标签信息 |

这些对象通常保存在：

```text
.git/objects/
```

每个对象都有一个由其内容计算得到的哈希标识。

传统 Git 仓库默认使用 SHA-1 对象哈希，通常表现为 40 位十六进制字符串。

Git 也支持 SHA-256 格式的仓库。两种对象格式目前不能直接互换，因此不能简单地认为所有 Git 仓库都使用 SHA-1。

## 5.2 Blob：文件内容对象

Blob（Binary Large Object）用于保存文件内容。

例如：

```cpp
int main() {
    return 0;
}
```

Git 会将文件内容编码成一个 Blob 对象。

需要注意：

**Blob 只保存文件内容，不保存文件名和目录路径。**

也就是说：

```text
src/main.cpp
```

中的 `src` 和 `main.cpp` 并不属于 Blob 对象本身。

Git 会通过 Tree 对象记录这些信息。

可以使用下面的命令查看对象：

```bash
git hash-object main.cpp
```

默认情况下，这个命令只计算对象哈希，不会真正将对象写入对象数据库。

如果想写入：

```bash
git hash-object -w main.cpp
```

查看对象类型：

```bash
git cat-file -t <object-hash>
```

查看对象内容：

```bash
git cat-file -p <object-hash>
```

## 5.3 Tree：目录结构对象

既然 Blob 不保存文件名和目录信息，那么 Git 如何表示整个项目？

答案是 Tree 对象。

Tree 用于描述目录结构。

假设项目如下：

```text
project/
├── main.cpp
├── README.md
└── src/
    └── allocator.cpp
```

Git 可以将其表示为：

```text
                 Tree(root)
                /    |     \
               /     |      \
          Blob     Blob    Tree(src)
        main.cpp  README.md    |
                               |
                            Blob
                         allocator.cpp
```

Tree 对象中保存：

- 文件名。
- 文件模式（例如普通文件、可执行文件、符号链接或子树）。
- 对应 Blob 或 Tree 的对象 ID。

这样，Git 就可以通过递归的 Tree 对象构建完整的项目目录结构。

## 5.4 Commit：提交对象

Commit 对象是 Git 历史模型的核心。

它主要包含：

- 对应的顶层 Tree。
- 父提交的对象 ID。
- 作者信息。
- 提交者信息。
- 时间戳。
- 提交说明。

可以用下面的结构理解：

```text
Commit Object
+----------------------+
| tree:  abc123        |
| parent: def456       |
| author: Alice        |
| committer: Alice     |
| timestamp            |
| message              |
+----------------------+
```

其中：

`tree` 指向本次提交对应的项目快照。

`parent` 指向上一次提交。

对于第一次提交，没有父提交。

对于普通 Merge Commit，通常存在两个父提交；对于 Octopus Merge，还可以有更多父提交。

这意味着 Git 的提交历史实际上不是简单的线性链表，而是一个有向无环图（DAG）。

例如：

```text
       A---B---C
      /         \
D----E-----------M
      \         /
       F-------G
```

M 是一次合并提交。

通过父提交关系，我们可以从任意提交追溯到它的历史祖先。

## 5.5 Git 为什么使用快照，而不是只保存 Diff？

这是理解 Git 的关键。

传统版本控制系统经常采用 Delta-based Model，即记录版本之间的差异。

例如：

```text
Version 1
    |
    +-- 修改 A
    |
Version 2
    |
    +-- 修改 B
    |
Version 3
```

要恢复 Version 3，可能需要从 Version 1 开始逐步应用后续差异。

Git 的逻辑模型不同。

它将每次提交表示为一个完整的项目快照。

例如：

```text
Commit 1 ---> Tree 1
Commit 2 ---> Tree 2
Commit 3 ---> Tree 3
```

每个 Commit 都指向对应的 Tree。

这意味着 Git 可以直接通过提交对象找到对应的项目状态，而不必在逻辑上逐个重放历史 Diff。

但这并不意味着 Git 每次提交都会复制整个项目。

原因是：

**Git 对象是不可变的，并且相同内容可以共享同一个 Blob 或 Tree 对象。**

例如：

```text
Commit 1
    |
    v
   Tree 1
   /    \
Blob A  Blob B

Commit 2
    |
    v
   Tree 2
   /    \
Blob A  Blob C
```

假设第二次提交只修改了一个文件。

那么没有变化的 Blob A 可以继续复用，只有发生变化的对象需要重新创建。

这就是 Git 快照模型能够保持高效的重要原因。

此外，Git 在对象存储层还会通过 Packfile、Delta Compression 等技术进一步压缩对象，减少磁盘空间占用。

因此要区分两个层面：

- 逻辑层：每次提交表示一个完整快照。
- 物理存储层：对象可以共享，并通过压缩技术节省空间。

## 5.6 内容寻址与数据完整性

Git 的对象 ID 不是随机分配的。

它由对象类型、内容长度和对象内容共同计算得到。

概念上：

```text
object_hash = HASH(
    object_type
    + " "
    + content_length
    + "\0"
    + content
)
```

例如：

```text
blob 13\0Hello World
```

通过 SHA-1 计算后得到对应的对象 ID。

这就是内容寻址（Content Addressing）。

它有几个重要特点：

**1. 相同内容产生相同对象 ID。**

同一个仓库中，相同内容的 Blob 可以复用。

**2. 内容发生变化，对象 ID 通常也会变化。**

这使得 Git 能够识别对象内容是否发生变化。

**3. 提交历史具有传递性的完整性验证能力。**

Commit 指向 Tree，Tree 指向 Blob 和其他 Tree，Commit 又通过 parent 指向历史提交。

如果某个底层对象内容发生变化，其哈希就会改变，进而影响引用它的上层对象。

因此，提交对象可以作为整个项目快照及其历史关系的校验入口。

需要注意：哈希校验本身不等于身份认证或数字签名。对于需要验证作者身份和发布来源的场景，还需要使用签名提交、签名标签和可信密钥管理。

## 5.7 Git 的分支为什么如此轻量？

理解了 Commit 对象，就能理解 Git 分支。

在 Git 中，分支本质上是一个指向 Commit 的引用。

例如：

```text
main -> Commit A
```

执行：

```bash
git branch feature
```

实际上只是创建一个新的引用：

```text
main    -> Commit A
feature -> Commit A
```

并没有复制整个项目。

之后在 feature 分支提交：

```text
main    -> Commit A

feature -> Commit B
```

由于 Commit B 指向 Commit A 作为父提交，因此形成：

```text
Commit A ----> Commit B
    ^               ^
    |               |
   main           feature
```

分支的本质不是代码副本，而是指向提交对象的可移动引用。

这就是为什么 Git 创建分支非常快。

## 5.8 HEAD 是什么？

HEAD 是 Git 中非常重要的引用。

通常情况下，HEAD 指向当前分支。

例如：

```text
HEAD
 |
 v
refs/heads/main
 |
 v
Commit A
```

当执行：

```bash
git switch feature
```

HEAD 会指向 feature 分支。

当创建新的提交时：

1. Git 根据暂存区创建新的 Tree。
2. 创建 Commit 对象。
3. 将当前分支引用移动到新的 Commit。

例如：

```text
之前：

HEAD -> main -> Commit A

提交之后：

HEAD -> main -> Commit B
                         |
                         v
                      Commit A
```

这也解释了 Git 的分支为什么能够快速切换。

大多数情况下，切换分支只需要移动引用，并更新工作区和索引以匹配目标提交。

## 5.9 Index：暂存区的底层实现

前面介绍了 Git 的三个核心区域。

现在深入理解 Index。

Git 的 Index 通常保存在：

```text
.git/index
```

它是 Git 在工作区和仓库之间使用的重要数据结构。

Index 中保存了准备提交的文件信息，例如：

- 文件路径。
- 文件模式。
- 对应的 Blob 对象 ID。
- 文件元数据。
- 合并阶段信息。

执行：

```bash
git add main.cpp
```

Git 通常会：

1. 读取文件内容。
2. 创建或复用对应的 Blob 对象。
3. 更新 Index 中对应文件的记录。

执行：

```bash
git commit
```

Git 会根据 Index 构建 Tree 对象，再创建 Commit 对象。

可以使用：

```bash
git ls-files --stage
```

查看暂存区中的索引条目。

也可以：

```bash
git ls-tree HEAD
```

查看当前提交对应的 Tree 内容。

这里有一个重要区别：

- HEAD 表示当前提交的项目状态。
- Index 表示下一次提交准备记录的项目状态。
- Working Tree 表示当前实际工作目录中的文件状态。

这三个状态共同构成了 Git 的日常工作模型。

## 5.10 Git 如何完成三方合并？

合并是版本控制系统最复杂、也最重要的功能之一。

假设有如下提交历史：

```text
       B---C  feature
      /
A----D        main
```

这里为了更清楚地说明合并过程，可以将共同祖先表示为 A，main 和 feature 分别产生了自己的修改。

Git 执行合并时，需要找到两个分支的共同祖先（Merge Base）。

然后比较三个版本：

1. 共同祖先版本。
2. 当前分支版本。
3. 被合并分支版本。

这就是三方合并（Three-way Merge）。

例如：

共同祖先：

```cpp
int max_connections = 100;
```

main 分支：

```cpp
int max_connections = 200;
```

feature 分支：

```cpp
int max_connections = 300;
```

Git 会发现：

- main 修改了这一行。
- feature 也修改了这一行。
- 两者修改内容不同。

于是无法自动决定最终结果，需要开发人员解决冲突。

但如果两个分支修改了不同的文件，或者修改了同一文件中互不冲突的区域，Git 通常可以自动合并。

解决冲突后：

```bash
git add config.cpp
git commit
```

最终生成一个包含两个父提交的 Merge Commit。

## 5.11 Packfile：Git 如何节省存储空间？

如果每次提交都创建新的对象，仓库会不会变得非常大？

Git 通过 Packfile 解决了这个问题。

Git 的对象最初可以以松散对象（Loose Objects）的形式存储：

```text
.git/objects/
```

随着对象数量增加，Git 可以将它们整理成 Packfile。

Packfile 将多个对象压缩存储，并可以通过 Delta Compression 记录对象之间的差异。

例如：

```text
Blob A
    |
    +---- Blob B（相对于 A 的差异）
    |
    +---- Blob C（相对于 B 的差异）
```

这里需要特别注意：

Delta Compression 只是底层存储优化，并不会改变 Git 在逻辑上使用快照表示提交的模型。

相关文件通常包括：

```text
.git/objects/pack/
    pack-xxxx.pack
    pack-xxxx.idx
```

其中：

- `.pack` 保存压缩后的对象数据。
- `.idx` 提供对象 ID 到 Packfile 内部位置的索引。

可以使用：

```bash
git count-objects -vH
```

查看仓库对象存储统计。

也可以：

```bash
git gc
```

执行垃圾回收和对象整理。

`git gc` 通常会执行对象打包、清理不可达对象以及其他仓库维护工作。实际行为受配置和仓库状态影响。

## 5.12 Git 的完整数据模型

现在将前面的内容整合起来：

```text
                  HEAD
                    |
                    v
                Branch Ref
                    |
                    v
                 Commit
                /      \
               /        \
            Tree       Parent
           /   \
          /     \
       Blob     Tree
                 |
                 v
                Blob
```

Git 的核心对象关系可以概括为：

```text
Commit
  |
  +---- Tree
  |       |
  |       +---- Blob
  |       |
  |       +---- Tree
  |
  +---- Parent Commit
```

其中：

- Blob 保存文件内容。
- Tree 保存目录结构。
- Commit 保存项目快照和历史关系。
- Tag 用于标记重要对象。
- Branch 是指向 Commit 的引用。
- HEAD 表示当前检出的分支或提交。
- Index 表示下一次提交准备记录的状态。

理解这个模型，Git 的大部分日常行为就都能解释清楚了。

---

# 六、总结

Git 不只是一个代码备份工具，而是一套围绕内容寻址、不可变对象、快照和提交图构建的分布式版本控制系统。

回顾全文，可以将 Git 的核心设计归纳为：

| 核心概念 | 解决的问题 |
|---|---|
| 分布式仓库 | 每个开发者都拥有完整历史 |
| Blob | 保存文件内容 |
| Tree | 表示项目目录结构 |
| Commit | 记录项目快照和历史关系 |
| Hash | 提供内容寻址和完整性校验 |
| Branch | 轻量地组织并行开发 |
| HEAD | 指示当前检出位置 |
| Index | 管理下一次提交的内容 |
| Merge | 整合不同开发历史 |
| Packfile | 提高对象存储效率 |

对于实际的软件开发，我认为有三个层次值得掌握：

**第一层：熟练使用。**

能够独立完成 Clone、Add、Commit、Push、Pull、Branch、Merge、Rebase、Reset、Revert 等操作。

**第二层：理解工程实践。**

能够参与企业中的分支管理、代码评审、CI/CD、版本发布和协作流程。

**第三层：理解底层实现。**

理解 Blob、Tree、Commit、Index、Ref、DAG、Packfile 等核心数据结构，能够解释 Git 的设计与行为。

真正掌握 Git，不是记住多少条命令，而是能够在复杂的多人协作和代码演进过程中，安全、准确、高效地管理软件变更。

---

# 七、进一步学习资料

建议按照以下顺序深入学习。

## 7.1 Pro Git

**<https://git-scm.com/book/zh/v2>**

Git 最值得阅读的系统性教材之一。

重点阅读：

- Git 基础。
- Git 分支。
- Git 服务器。
- 分布式 Git。
- Git 工具。
- Git 内部原理。

其中 Git Internals 一章尤其值得深入阅读。

## 7.2 Git 官方文档

**<https://git-scm.com/docs>**

学习 Git 时，建议养成查看官方文档的习惯。

特别推荐：

- `git-commit`
- `git-add`
- `git-reset`
- `git-rebase`
- `git-merge`
- `git-reflog`
- `git-rev-parse`
- `git-cat-file`
- `git-ls-tree`
- `git-update-index`

## 7.3 Git 内部原理教程

**<https://git-scm.com/docs/gitcore-tutorial>**

进一步了解 Git 的对象数据库、提交、引用和底层数据模型。

## 7.4 Git 工作流

**<https://git-scm.com/docs/gitworkflows>**

了解 Git 在实际团队开发中的工作流设计。

## 7.5 GitHub 协作实践

**<https://docs.github.com/en/pull-requests>**

重点学习：

- Pull Request。
- Code Review。
- Branch Protection。
- Code Owners。
- Merge Strategies。

## 7.6 推荐的动手实验

如果想真正理解 Git 内部实现，建议自己完成以下实验。

### 实验一：手动创建 Git 对象

```bash
mkdir git-internals
cd git-internals

git init

echo "Hello Git" > hello.txt

git hash-object -w hello.txt
```

然后查看对象：

```bash
git cat-file -t <hash>
git cat-file -p <hash>
```

理解 Blob 的创建过程。

### 实验二：查看 Tree 对象

```bash
git add hello.txt

git write-tree
```

查看 Tree：

```bash
git cat-file -p <tree-hash>
```

理解文件内容与目录结构的分离。

### 实验三：理解 Commit 对象

```bash
git commit -m "initial commit"

git cat-file -p HEAD
```

观察：

- tree
- parent
- author
- committer
- message

理解 Commit 如何组织历史。

### 实验四：理解分支

```bash
git branch feature

cat .git/refs/heads/main
cat .git/refs/heads/feature
```

观察两个分支引用的对象 ID。

然后提交一次新修改，再次观察引用变化。

### 实验五：理解三方合并

创建两个分支，让它们修改同一个文件的不同位置，然后执行 Merge。

观察 Git 如何找到共同祖先，以及如何处理冲突。

### 实验六：理解 Git 的对象存储

```bash
git count-objects -vH

git gc

git count-objects -vH
```

观察对象打包前后的存储变化。

**建议：不要只停留在 Git 命令层面。自己动手观察 `.git` 目录中的对象和引用，才能真正理解 Git 的设计。**