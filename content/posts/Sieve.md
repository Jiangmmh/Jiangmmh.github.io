---
title: "埃拉托色尼筛法（Sieve of Eratosthenes）"
date: '2026-10-26T17:25:46+08:00'
draft: false
tags: []
categories: []
---
# 一、原理

埃拉托色尼筛法是一种古老而高效的求素数算法，由古希腊数学家埃拉托色尼（Eratosthenes，约公元前276—前194年）提出。

**核心思想**：**素数的倍数一定不是素数**。因此，从最小的素数 2 开始，把它的所有倍数"筛掉"（标记为合数），然后找到下一个未被筛掉的数（它一定是素数），再筛掉它的倍数……如此反复，最后剩下的就是素数。

**算法步骤**：以求 n = 30 以内的素数为例
1. 列出 2 到 n 的所有整数。
2. 从 2 开始，2 是素数，划掉所有 2 的倍数（4, 6, 8, …, 30）。
3. 找到下一个未划掉的数 3，它是素数，划掉所有 3 的倍数（6, 9, 12, …, 30）。
4. 下一个未划掉的数是 5，划掉 5 的倍数（10, 15, 20, 25, 30）。
5. 下一个是 7，划掉 7 的倍数（14, 21, 28）。
6. 下一个是 11，但 11² = 121 > 30，停止（见下方优化说明）。
7. 剩下未被划掉的数即为素数：2, 3, 5, 7, 11, 13, 17, 19, 23, 29。

**进一步优化**
- 只需筛到 √n：若 `i * i > n`，则 i 之后的合数必然已被更小的素数筛掉，无需继续。
- 从 `i²` 开始筛：筛素数 i 的倍数时，可以从 `i*i` 开始，因为小于 `i*i` 的 i 的倍数（如 i*2, i*3, …）已经被比 i 小的素数筛掉了。
- 只处理奇数（可选）：除 2 以外，偶数都不是素数，可以只对奇数进行筛选，节省一半空间和时间。


# 二、实现

Python实现：
```python
def primes(n):
    """
    Compute all the primes up to (but not including) n via sieve of Eratosthenes.
    
    Input:
        n: integer
    Output:
        list of primes up to (not including) n
    """

    if n < 2:
      return []
    is_prime = [True] * n
    is_prime[0] = is_prime[1] = False

    i = 2
    while i * i < n:
      if is_prime[i]:
        for j in range(i*i, n, i):
          is_prime[j] = False
        i += 1
    return [x for x in range(n) if is_prime[x]]
```
C++实现：
```c++
#include <vector>
using namespace std;

vector<int> sieve(int n) {
    vector<bool> is_prime(n + 1, true);
    is_prime[0] = is_prime[1] = false;
    for (int i = 2; (long long)i * i <= n; i++) {
        if (is_prime[i]) {
            for (long long j = (long long)i * i; j <= n; j += i)
                is_prime[j] = false;
        }
    }
    vector<int> primes;
    for (int i = 2; i <= n; i++)
        if (is_prime[i]) primes.push_back(i);
    return primes;
}
```