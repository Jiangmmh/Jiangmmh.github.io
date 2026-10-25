# Lab0 Xv6 and Unix utilities

# 一、环境准备

环境配置见[文档](lab tools page)，Linux和Mac皆可。

拉取实验代码：

```bash
$ git clone git://g.csail.mit.edu/xv6-labs-2026
Cloning into 'xv6-labs-2026'...
...
$ cd xv6-labs-2026
```

项目中已经提供了Makefile，直接构建并通过qemu启动即可：

```bash
$ make qemu
riscv64-unknown-elf-gcc    -c -o kernel/entry.o kernel/entry.S
riscv64-unknown-elf-gcc -Wall -Werror -O -fno-omit-frame-pointer -ggdb -DSOL_UTIL -MD -mcmodel=medany -ffreestanding -fno-common -nostdlib -mno-relax -I. -fno-stack-protector -fno-pie -no-pie   -c -o kernel/start.o kernel/start.c
...
riscv64-unknown-elf-ld -z max-page-size=4096 -N -e main -Ttext 0 -o user/_zombie user/zombie.o user/ulib.o user/usys.o user/printf.o user/umalloc.o
riscv64-unknown-elf-objdump -S user/_zombie > user/zombie.asm
riscv64-unknown-elf-objdump -t user/_zombie | sed '1,/SYMBOL TABLE/d; s/ .* / /; /^$/d' > user/zombie.sym
mkfs/mkfs fs.img README  user/xargstest.sh user/_cat user/_echo user/_forktest user/_grep user/_init user/_kill user/_ln user/_ls user/_mkdir user/_rm user/_sh user/_stressfs user/_usertests user/_grind user/_wc user/_zombie
nmeta 46 (boot, super, log blocks 30 inode blocks 13, bitmap blocks 1) blocks 954 total 1000
balloc: first 591 blocks have been allocated
balloc: write bitmap block at sector 45
qemu-system-riscv64 -machine virt -bios none -kernel kernel/kernel -m 128M -smp 3 -nographic -drive file=fs.img,if=none,format=raw,id=x0 -device virtio-blk-device,drive=x0,bus=virtio-mmio-bus.0

xv6 kernel is booting

hart 2 starting
hart 1 starting
init: starting sh
$
```

关于xv6项目目录结构、构建流程和Boot细节，可以看我的这篇[文章](https://jiangmmh.github.io/posts/xv6-01/)。

# 二、**sleep (easy)**

> sleep要求根据输入参数的值，让系统睡眠若干ticks。
> 

该功能可以通过xv6内核提供的pause系统调用实现，此外还需要使用ulib中提供的atoi()函数将输入参数转换为整数。

在user/目录下创建源文件sleep.c，实现该功能：

```c
#include "kernel/types.h"
#include "user/user.h"

int main(int argc, char* argv[]) {
	if (argc < 2) {
		printf("Usage: sleep [ticks]");
		return 1;
	}
	pause(atoi(argv[1]));
	return 0;
}
```

在Makefile中的UPROGS变量中加入sleep：

```c
UPROGS=\
	$U/_cat\
	$U/_echo\
	$U/_forktest\
	$U/_grep\
	$U/_init\
	$U/_kill\
	$U/_ln\
	$U/_ls\
	$U/_mkdir\
	$U/_rm\
	$U/_sh\
	$U/_stressfs\
	$U/_usertests\
	$U/_grind\
	$U/_wc\
	$U/_zombie\
	$U/_logstress\
	$U/_forphan\
	$U/_dorphan\
	$U/_sync\
	$U/_sleep\
```

测试一下：

```bash
xv6-labs-2026 ➜ ./grade-lab-util sleep
make: `kernel/kernel' is up to date.
== Test sleep, no arguments == sleep, no arguments: OK (1.4s) 
== Test sleep, returns == sleep, returns: OK (1.0s) 
== Test sleep, makes syscall == sleep, makes syscall: OK (1.0s) 
== Test sleep, zero and non-numeric args return == sleep, zero and non-numeric args return: OK (1.0s) 
```

# 二、**sixfive (moderate)**

> 实现一个程序sixfive，参数为若干文件的路径，其读取文件中的内容，输出其中所有值为5或6的倍数的数字。
> 

这里的数字有具体的含义：**A sequence of decimal digits separated by characters in the string " -\r\t\n./,"**。

实现思路：

- 参考cat.c的实现，编写一个函数sixfive()，接收一个文件描述符，统一处理标准输入和文件输入。
- 使用read()，

```c
void sixfive(int fd) {
    int n, x = 0, prev_is_delim = 1;
    int in_digits = 0;
    char c;

    while ((n = read(fd, &c, 1)) > 0) {
        if (isdigit(c)) {
            if (!in_digits && prev_is_delim) {
                in_digits = 1;
                x = c - '0';
            } else if (in_digits) {
                x = x * 10 + (c - '0');
            }
            prev_is_delim = 0;
        } else {
            if (in_digits) {
                if (x % 5 == 0 || x % 6 == 0) {
                    fprintf(2, "%d\n", x);
                }
                x = 0;
            } else if (isdelim(c)){
                prev_is_delim = 1;
            } else {
                prev_is_delim = 0;
            }
        }
    }
    if (x % 5 == 0 || x % 6 == 0) {
        fprintf(2, "%d\n", x);
    }
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        // 无输入参数，使用标准输入
        sixfive(0);
        return 0;
    } 
    
    // 遍历
    for (int i = 1; i < argc; i++) {
        int fd;
        if ((fd = open(argv[i], O_RDONLY)) < 0) {
            fprintf(2, "cannot open %s, where %s is the file name.", 
                argv[i], argv[i]);
            continue;
        }
        sixfive(fd);
        close(fd);
    }

    return 0;
}
```

# 三、**memdump (moderate)**

这道题考查的是对C语言指针和地址的理解，按要求输出对应内容即可。

注意fmt与data中实际存储的数据可能不匹配，如果fmt要求的数据长度超过data实际存储的数据长度len，要输出字符串：**“memdump: not enough data for 'X'”**。

```c
void
memdump(char *fmt, char *data, int len)
{
  // Your code here.  `data` holds `len` valid bytes.
  int n = strlen(fmt);
  for (int i = 0; i < n; i++) {
    switch (fmt[i])
    {
    case 'i':
      if (len < 4) {
        printErr('i');
      } 
      printf("%d\n", *(int*)data);
      len -= 4;
      data += 4;
      break;
    case 'p':
      if (len < 8) {
        printErr('p');
      } 
      printf("%lx\n", *(long*)(data+i));
      len -= 8;
      data += 8;
      break;
    case 'h':
      if (len < 2) {
        printErr('h');
      } 
      printf("%d\n", *(short*)data);
      len -= 2;
      data += 2;
      break;
    case 'c':
      if (len < 1) {
        printErr('c');
      } 
      printf("%c\n", *data);
      len -= 1;
      data += 1;
      break;
    case 's':
      if (len < 8) {
        printErr('s');
      } 
      printf("%s\n", (char*)(*(uint64*)data));
      len -= 8;
      data += 8;
      break;
    case 'S':
      printf("%s\n", data);
      break;
    default:
      break;
    }
  }
}

void printErr(char cmd) {
  printf("memdump: not enough data for '%c'", cmd);
}
```

测试一下：

```bash
xv6-labs-2026 ➜ ./grade-lab-util memdump
make: `kernel/kernel' is up to date.
== Test memdump, examples == memdump, examples: OK (1.4s) 
== Test memdump, format ii, S, p == memdump, format ii, S, p: OK (0.8s) 
== Test memdump, formats h c, bounds checking, usage == memdump, formats h c, bounds checking, usage: OK (1.1s)
```

# 四、**find (moderate)**

题目要求实现find命令，功能是从第一个参数指定的目录开始，递归地搜索目标文件，输出所有找到的目标文件路径。

在user/目录下创建文件find.c：

```c
#include "kernel/types.h"
#include "kernel/stat.h"
#include "user/user.h"
#include "kernel/fs.h"
#include "kernel/fcntl.h"

void
find(char *path, char *target)
{
    char buf[512], *p;
    int fd;
    struct dirent de;
    struct stat st;

    // 打开path对应的文件
    if ((fd = open(path, O_RDONLY)) < 0) {
        fprintf(2, "find: cannot open %s\n", path);
        return;
    }
    
    // 获取文件状态信息
    if (fstat(fd, &st) < 0) {
        fprintf(2, "find: cannot stat %s\n", path);
        close(fd);
        return;
    }

    // ==== 先比较本节点自己的名字，与类型无关 ====
    {
        char *base = path + strlen(path);
        while (base > path && base[-1] != '/')
            base--;
        if (strcmp(base, target) == 0)
            printf("%s\n", path);
    }

    // ==== 只有目录才继续递归 ====
    if (st.type == T_DIR) {
        if (strlen(path) + 1 + DIRSIZ + 1 > sizeof buf) {
            printf("find: path too long\n");
            close(fd);
            return;
        }

        // 将path拷贝到buf中，构建新的path
        strcpy(buf, path);
        p = buf + strlen(buf);
        *p++ = '/';
        while (read(fd, &de, sizeof(de)) == sizeof(de)) {
            if (de.inum == 0)
                continue;
            if (strcmp(de.name, ".") == 0 || strcmp(de.name, "..") == 0)
                continue;

            int len = strlen(de.name);
            memmove(p, de.name, len);
            p[len] = 0;
            
            find(buf, target);   // 无条件递归，子调用会自己比较名字
        }
    }

    close(fd);
}

int
main(int argc, char *argv[])
{
    if (argc != 3) {
        fprintf(2, "Usage: find [path] [target]\n");
        exit(1);
    }

    find(argv[1], argv[2]);

    exit(0);
}
```

在Makefile中添加：

```makefile
UPROGS=\
	......
	$U/_find\
```

测试一下：

```bash
xv6-labs-2026 ➜ ./grade-lab-util find
make: `kernel/kernel' is up to date.
== Test find, in current directory == find, in current directory: OK (1.0s) 
== Test find, in sub-directory == find, in sub-directory: OK (0.9s) 
== Test find, recursive == find, recursive: OK (1.1s) 
== Test find, missing target, no duplicates, directory match == find, missing target, no duplicates, directory match: OK (1.1s) 
```

# 五、**exec (moderate)**

题目要求在find的基础上实现 -exec 选项，用于将find搜索得到的结果作为其他命令的参数。

我的实现思路：

- 在main函数中遍历命令行参数argv，检查是否存在 “-exec”，如果存在就将do_exec置为1，表示需要对搜索结果执行命令
- 此外还要记录“-exec”后的命令和参数，为后续命令的执行提供支持
- 在find中找到目标文件后，根据do_exec的值选择是打印还是执行其他命令
- 如果是执行其他命令，则需要构造好新的argc和argv，然后通过fork+exec执行该命令

```c
#include "kernel/types.h"
#include "kernel/stat.h"
#include "user/user.h"
#include "kernel/fs.h"
#include "kernel/fcntl.h"

// 对匹配到的 path 执行 args 指定的命令
// args 形如 { "echo", "hi", 0 }，我们构造 { "echo", "hi", path, 0 }
static void
run_exec(char *args[], char *path)
{
    // 计算 args 长度
    int n = 0;
    while (args[n])
        n++;

    // 构造新 argv：原 args + path + 0
    char **argv = (char **)malloc((n + 2) * sizeof(char *));
    if (argv == 0) {
        fprintf(2, "find: malloc failed\n");
        return;
    }
    for (int i = 0; i < n; i++)
        argv[i] = args[i];
    argv[n] = path;
    argv[n + 1] = 0;

    // 经典的 fork + exec
    int pid = fork();
    if (pid < 0) {
        fprintf(2, "find: fork failed\n");
        free(argv);
        return;
    }
    if (pid == 0) {
        exec(argv[0], argv);
        fprintf(2, "find: exec %s failed\n", argv[0]);
        exit(1);
    }
    free(argv);
    wait(0);
}

void
find(char *path, char *target, int do_exec, char* args[])
{
    char buf[512], *p;
    int fd;
    struct dirent de;
    struct stat st;

    // 打开path对应的文件
    if ((fd = open(path, O_RDONLY)) < 0) {
        fprintf(2, "find: cannot open %s\n", path);
        return;
    }
    
    // 获取文件状态信息
    if (fstat(fd, &st) < 0) {
        fprintf(2, "find: cannot stat %s\n", path);
        close(fd);
        return;
    }

    // ==== 先比较本节点自己的名字，与类型无关 ====
    {
        char *base = path + strlen(path);
        while (base > path && base[-1] != '/')
            base--;

        
        if (strcmp(base, target) == 0){
            if (do_exec) 
                run_exec(args, path);
            else 
                printf("%s\n", path);
        }
    }

    // ==== 只有目录才继续递归 ====
    if (st.type == T_DIR) {
        if (strlen(path) + 1 + DIRSIZ + 1 > sizeof buf) {
            printf("find: path too long\n");
            close(fd);
            return;
        }

        // 将path拷贝到buf中，构建新的path
        strcpy(buf, path);
        p = buf + strlen(buf);
        *p++ = '/';
        while (read(fd, &de, sizeof(de)) == sizeof(de)) {
            if (de.inum == 0)
                continue;
            if (strcmp(de.name, ".") == 0 || strcmp(de.name, "..") == 0)
                continue;

            int len = strlen(de.name);
            memmove(p, de.name, len);
            p[len] = 0;

            find(buf, target, do_exec, args);   // 无条件递归，子调用会自己比较名字
        }
    }

    close(fd);
}

int
main(int argc, char *argv[])
{
    if (argc < 3) {
        fprintf(2, "Usage: find [path] [target] [-exec cmd args]\n");
        exit(1);
    }

    char *path = argv[1];
    char *target = argv[2];
    char **args = 0;
    int do_exec = 0;

    for (int i = 3; i < argc; i++) {
        if (strcmp(argv[i], "-exec") == 0) {
            if (i == argc-1) {
                fprintf(2, "find: -exec has no cmd\n");
                exit(1);
            }
            do_exec = 1;
            args = &argv[i+1];
            break;
        }
    }

    find(path, target, do_exec, args);
    exit(0);
}
```

测试一下：

```bash
xv6-labs-2026 ➜ ./grade-lab-util exec
make: `kernel/kernel' is up to date.
== Test exec == exec: OK (0.6s) 
== Test exec, multiple args == exec, multiple args: OK (0.9s) 
== Test exec via sh script == exec via sh script: OK (1.1s) 
```

# 六、总结

这个lab的主要目的是让我们熟悉C语言编程和xv6的系统调用接口。

最后使用make grade重新进行完整的测试，并给出如下评分。

```bash
xv6-labs-2026 ➜ make grade
== Test sleep, no arguments == 
$ make qemu-gdb
sleep, no arguments: OK (5.2s) 
== Test sleep, returns == 
$ make qemu-gdb
sleep, returns: OK (0.4s) 
== Test sleep, makes syscall == 
$ make qemu-gdb
sleep, makes syscall: OK (0.9s) 
== Test sixfive_test == 
$ make qemu-gdb
sixfive_test: OK (1.1s) 
== Test sixfive_readme == 
$ make qemu-gdb
sixfive_readme: OK (1.5s) 
== Test sixfive_all == 
$ make qemu-gdb
sixfive_all: OK (1.0s) 
== Test memdump, examples == 
$ make qemu-gdb
memdump, examples: OK (0.4s) 
== Test memdump, format ii, S, p == 
$ make qemu-gdb
memdump, format ii, S, p: OK (1.0s) 
== Test find, in current directory == 
$ make qemu-gdb
find, in current directory: OK (1.0s) 
== Test find, in sub-directory == 
$ make qemu-gdb
find, in sub-directory: OK (1.0s) 
== Test find, recursive == 
$ make qemu-gdb
find, recursive: OK (1.2s) 
== Test exec == 
$ make qemu-gdb
exec: OK (0.8s) 
== Test exec, multiple args == 
$ make qemu-gdb
exec, multiple args: OK (1.0s) 
== Test exec via sh script == 
$ make qemu-gdb
exec via sh script: OK (1.1s) 
== Test sleep, zero and non-numeric args return == 
$ make qemu-gdb
sleep, zero and non-numeric args return: OK (0.8s) 
== Test sixfive, stdin and missing file == 
$ make qemu-gdb
sixfive, stdin and missing file: OK (1.1s) 
== Test memdump, formats h c, bounds checking, usage == 
$ make qemu-gdb
memdump, formats h c, bounds checking, usage: OK (1.0s) 
== Test find, missing target, no duplicates, directory match == 
$ make qemu-gdb
find, missing target, no duplicates, directory match: OK (1.2s) 
== Test time == 
time: OK 
Score: 156/156
```