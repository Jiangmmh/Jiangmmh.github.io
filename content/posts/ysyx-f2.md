---
title: "一生一芯-F2阶段笔记"
date: '2026-10-17T13:14:43+08:00'
draft: false
tags: [处理器, RISC-V, ]
categories: [一生一芯]
---

# Logisim简介

Logisim是一款图形化的数字电路设计软件, 用户可以通过拖动相应的电路组件来设计数字电路并仿真运行. 后续我们使用的是Logisim-evolution, 它是Logisim的升级版, 提供了更丰富的组件. 但为了描述简便, 下文我们还是使用`Logisim`来指代这个升级版.

Logisim是一个Java程序, 可以运行在任何支持Java运行环境的操作系统上. 虽然它支持在Windows, Mac OS, Linux等各种主流系统上运行, 但目前我们不要求大家使用Linux操作系统. 如果你有一些Linux操作系统的使用经验, 可以自己解决环境配置相关的问题, 也可以使用Linux版本.

# Ligisim的下载

通过Github的Release页面可以下载最新的Logisim-evolution。https://github.com/logisim-evolution/logisim-evolution/releases。

我的设备是MacM4，所以选择ARM版本的dmg文件：

![](/images/posts/ysyx-f2/image.png)

安装后启动：

![](/images/posts/ysyx-f2/image%201.png)

# 设计一个简单的电路

这是一个简单的选择器，其根据输入信号S来选择输出A还是B，测试结果如下：

![](/images/posts/ysyx-f2/image%202.png)