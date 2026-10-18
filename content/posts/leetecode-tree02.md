---
title: "Leetecode 二叉树(二)"
date: '2026-10-16T11:20:25+08:00'
draft: false
tags: [二叉树, 自底向上DFS]
categories: [Leetecode]
---
题目来自灵神的题单：[二叉树题单](https://leetcode.cn/discuss/post/3142882/fen-xiang-gun-ti-dan-lian-biao-er-cha-sh-6srp/)。

在[上一篇文章](https://jiangmmh.github.io/posts/leetecode-tree01/)中已经介绍了**简单遍历**和**自顶向下DFS**的思路，这篇文章主要介绍自底向上DFS的思路。
# 一、**自底向上 DFS（后序遍历）**

在二叉树系列的前一篇博客中其实已经提到过了自顶向下和自底向上的区别了，这里再啰嗦一遍。

- 自顶向下，指从根节点往叶子节点 **“递”的过程中** 更新结果
- 自底向上，指先递归处理叶子节点，在 **“归“的过程中** 更新结果

## 21. **二叉树的最大深度**

**自底向上的解法：**

先递归得到左右子树各自的最大深度，然后取大者+1作为结果返回。

时间复杂度：O(n)，空间复杂度：O(n)

```cpp
class Solution {
public:
    int maxDepth(TreeNode* root) {
		    // base case
        if (!root) return 0; 

        // 递归求解左右子树的最大深度
        int l = maxDepth(root->left);
        int r = maxDepth(root->right);

        return max(l, r) + 1;
    }
};
```

## 22. **二叉树的最小深度**

> 注意：最小深度必须从根到叶子，即当一个节点只有一个孩子时，不能直接返回，而是要继续递归直至叶子节点。
> 

**自底向上的解法**

有这么几种情况：

- 当前节点为空，直接返回0
- **左子树为空，右子树不为空**，返回minDepth(root->right) + 1
- **右子树为空，左子树不为空**，返回minDepth(root->left) + 1
- 左右子树均不为空，返回min(min_l, min_r)+1

时间复杂度：O(n)，空间复杂度：O(n)

```cpp
class Solution {
public:
    int minDepth(TreeNode* root) {
        if (!root) return 0;
        if (!root->left && root->right) return minDepth(root->right) + 1;
        if (!root->right && root->left) return minDepth(root->left) + 1;

        int min_l = minDepth(root->left);
        int min_r = minDepth(root->right);

        return min(min_l, min_r)+1;
    }
};
```

## 23. **单值二叉树**

题目要求判断树中各节点的值是否均相同，我的思路：

- 使用变量rootval记录根节点的值（题目保证树非空）
- 准备一个初值为true的bool变量ans记录答案
- 遍历整棵二叉树，如果发现存在节点值不等于rootval，则将ans置为false
- 最后返回ans即可

```cpp
class Solution {
public:
    bool isUnivalTree(TreeNode* root) {
        // 树非空
        int rootval = root->val;
        bool ans = true;

        auto dfs = [&](auto&& self, TreeNode* node) {
            if (!node) return;
            if (node->val != rootval) {
                ans = false;
                return ;
            }
            self(self, node->left);
            self(self, node->right);
        };

        dfs(dfs, root);
        return ans;
    }
};
```

## 24. **相同的树**

题目要求：判断两棵树上对应节点的值是否完全相同

思路：递归比较

- 如果p和q中有一棵树为空，那么只有两棵树均为空才可能返回true
- 如果p和q的值不等，直接返回false
- 依次递归比较p和q的左子树、右子树，两者均需要返回true才算相同

```cpp
class Solution {
public:
    bool isSameTree(TreeNode* p, TreeNode* q) {
        if (!p || !q) return p == q;
        
        if (p->val != q->val) return false;

        return isSameTree(p->left, q->left) 
            && isSameTree(p->right, q->right);
    }
};
```

## 25. **对称二叉树**

题目要求：判断一棵树是否对称，即对于任意子树，其左右子树对应节点的值均相同。

思路：同上题

- 如果p和q中有一棵树为空，那么只有两棵树均为空才可能返回true
- 如果p和q的值不等，直接返回false
- 在递归比较时，注意p的左子树要与q的右子树比较，p的右子树要与q的左子树比较

```cpp
class Solution {
public:
    bool isSymmetric(TreeNode* root) {
        auto dfs = [&](auto&& self, TreeNode* p, TreeNode *q) {
            if (!p || !q) return p == q;
            if (p->val != q->val) return false;
            return self(self, p->left, q->right)
                && self(self, p->right, q->left);
        };

        return dfs(dfs, root->left, root->right);
    }
};
```

## 27. **翻转等价二叉树**

题目要求：判断两棵二叉树能否在若干次翻转后等价

> 注意这里所谓的翻转后等价，其实就是指两棵树对称或直接等价。

有了前面两道题的经验，写出来不难。

```cpp
class Solution {
public:
    bool flipEquiv(TreeNode* root1, TreeNode* root2) {
        if (!root1 || !root2) return root1 == root2;
        if (root1->val != root2->val) return false;
        return 
            (flipEquiv(root1->left, root2->left) && flipEquiv(root1->right, root2->right)) ||
            (flipEquiv(root1->left, root2->right) && flipEquiv(root1->right, root2->left));
    }
};
```

## 28. **找出克隆二叉树中的相同节点**
思路：直接递归搜索树cloned，从中找到值与target相同的节点，返回其指针即可。

```cpp
class Solution {
public:
    TreeNode* getTargetCopy(TreeNode* original, TreeNode* cloned, TreeNode* target) {
        TreeNode* ans = nullptr;
        
        auto dfs = [&](auto&& self, TreeNode* c) {
            if (!c) return ;
            if (c->val == target->val) {
                ans = c;
                return ;
            }
            self(self, c->left);
            self(self, c->right);
        };

        dfs(dfs, cloned);
        return ans;
    }
};
```

## 29. 平衡二叉树

要求：判断一棵二叉树是否平衡。

思路：**当前树的深度** 等于 **左子树的深度** 与 **右子树的深度** 中的 **最大值** +1 。

**解法一：自顶向下递归**

编写一个求二叉树最大深度的函数，分别计算出左右子树的深度，要求差值不超过1，再递归判断左右子树是否平衡。

时间复杂度：O(nlogn)，空间复杂度：O(n)

```cpp
class Solution {
public:
    bool isBalanced(TreeNode* root) {
        if (root == nullptr) return true;
        return abs(depth(root->left) - depth(root->right)) < 2
	          && isBalanced(root->left) && isBalanced(root->right);
    }
private:
    int depth(TreeNode* root) {
        if (root == nullptr) return 0;
        return max(depth(root->left), depth(root->right)) + 1;
    }
};
```

**解法二：自底向上递归**

解法一采用是自顶向下的思路，其中会反复调用depth求树的深度，而很多depth操作都是重复的、不必要的。因此考虑自底向上的思路，在判断子树是否平衡的同时，不断将当前深度往上传，而不是每次都从上到下求深度。

这里定义了一个函数dfs，它的作用有两点：

- 判断是否平衡，如果发现树不平衡就直接返回-1
- 如果树暂时平衡，则向上返回当前的深度

时间复杂度：O(n)，空间复杂度：O(n)

```cpp
class Solution {
public:
    bool isBalanced(TreeNode* root) {
        auto dfs = [&](auto&& self, TreeNode* node) -> int {
            if (!node) return 0;

            // 判断左子树是否平衡+求深度
            int l = self(self, node->left);
            if (l == -1) return -1; // 及时剪枝

            // 判断右子树是否平衡+求深度
            int r = self(self, node->right);
            if (r == -1) return -1; // 及时剪枝

            // 先判断平衡，如果平衡就返回最大深度，否则返回-1表示不平衡
            return abs(l - r) < 2 ? max(l, r) + 1 : -1;
        };
				
        return dfs(dfs, root) != -1;
    }
};
```

## 30. **翻转二叉树**

题目要求：翻转整棵二叉树，对于每个节点都调换左右子树。

思路：先反转左右子树，然后再更新根节点的指针。

```cpp
class Solution {
public:
    TreeNode* invertTree(TreeNode* root) {
        if (!root) return root;

        // 先对左右子树进行翻转
        auto l = invertTree(root->left);
        auto r = invertTree(root->right);
        
        // 再调换当前节点的左右子树
        root->left = r;
        root->right = l;
        return root;
    }
};
```

## 31. **合并二叉树**

题目要求：合并两颗二叉树对应位置的节点，如果节点均存在就求和。

思路：将root1作为要返回的二叉树，同步遍历两棵树：

- 如果两棵树均为空，返回nullptr
- 如果有一个颗树为空，返回另一棵树
- 否则，将root2上的值加到root1中，然后递归处理左右子树
- 最后返回root1

```cpp
class Solution {
public:
    TreeNode* mergeTrees(TreeNode* root1, TreeNode* root2) {
        if (!root1 && !root2) return nullptr;
        if (!root1 && root2) return root2;
        if (!root2 && root1) return root1;

        root1->val += root2->val;

        root1->left = mergeTrees(root1->left, root2->left);
        root1->right = mergeTrees(root1->right, root2->right);

        return root1;
    }
};
```

## 32. **计算布尔二叉树的值**

典型的自底向上DFS，对于任意一个分支节点（运算符），要计算以它为根的子树的值，就必须先计算出其左右子树的结果，再用该节点的运算符进行计算。

```cpp
class Solution {
public:
    bool evaluateTree(TreeNode* root) {
        if (root->val == 0) return false;
        if (root->val == 1) return true;

        if (root->val == 2) {
            return evaluateTree(root->left) 
                || evaluateTree(root->right);
        }
        if (root->val == 3) {
            return evaluateTree(root->left) 
                && evaluateTree(root->right);
        }

        return false;
    }
};
```

## 33. **出现次数最多的子树元素和**

思路：自底向上递归求树的和，在递归过程中使用哈希表mp记录所有子树的和出现的次数，并使用变量cnt记录所遇到的出现次数最多的子树和。

最后将哈希表中所有出现次数为cnt的和全部加入结果集ans并返回。

```cpp
class Solution {
public:
    vector<int> findFrequentTreeSum(TreeNode* root) {
        unordered_map<int, int> mp;
        int cnt = 0;

        auto dfs = [&](auto&& self, TreeNode* node) -> int {
            if (!node) return 0;
            int sl = self(self, node->left);
            int sr = self(self, node->right);

            int sum = sl + sr + node->val;
            mp[sum]++;
            cnt = max(cnt, mp[sum]);
            return sum;
        };

        vector<int> ans;
        dfs(dfs, root);

        for (auto item : mp) {
            if (item.second == cnt) {
                ans.push_back(item.first);
            }
        }

        return ans;
    }
};
```

## 34. **二叉树的坡度**

最直接的想法是自顶向下：在“递”的过程中，每次使用一个DFS求左右两棵子树的和，便可以得到当前根节点的坡度。但是这种写法会导致反复对子树进行求和，即使之前已经访问过它们了。

对于这种情况，使用自底向上的思路是最好的，在“归”的过程中将子树的和不断向上传，避免了重复访问节点来求和的不必要开销。

```cpp
class Solution {
public:
    int findTilt(TreeNode* root) {
        int ans = 0;

        // 返回node这棵树的节点之和
        auto dfs = [&](auto&& self, TreeNode* node) -> int {
            if (!node) return 0;
            
            // 求左右子树的和
            int l = self(self, node->left);
            int r = self(self, node->right);
            
            // 更新结果
            ans += abs(l - r);
            
            return node->val + l + r;
        };

        dfs(dfs, root);
        return ans;
    }
};
```

## 35. **统计二叉树中支配节点的数量**

基本思路和上题类似，都是自底向上“归”的过程中更新结果，并返回整棵子树的最大值（包括根节点）。

```cpp
class Solution {
public:
    int countDominantNodes(TreeNode* root) {
        int ans = 0;
        auto dfs = [&](auto&& self, TreeNode* node) -> int {
            if (!node) return INT_MIN;
            int l = self(self, node->left);
            int r = self(self, node->right);

            int max_val = max(l, r);
            if (node->val >= max_val) {
                ans++;
                max_val = node->val;
            }
            return max_val;
        };

        dfs(dfs, root);
        return ans;
    }
};
```

## 36. **根据二叉树创建字符串**

无趣的题目。

```cpp
class Solution {
public:
    string tree2str(TreeNode* root) {
        if (!root) return "";
        if (!root->left && !root->right) return to_string(root->val);
				
				// 右子树为空
        if (!root->right) 
            return to_string(root->val) + "(" + tree2str(root->left) + ")";
            
        // 右子树不为空
        return to_string(root->val) + "(" + tree2str(root->left) + ")(" + tree2str(root->right) + ")"; 
    }
};
```

## 37. **统计值等于子树平均值的节点数**

我的思路：递归函数应当返回 子树的和 + 子树的节点数。

这样就可以在归的过程中求出当前子树的平均值并记录。

```cpp
class Solution {
public:
    int averageOfSubtree(TreeNode* root) {
        int ans = 0;
        // 返回值为子树node和+节点数量
        auto dfs = [&](auto&& self, TreeNode* node) -> pair<int, int> {
            if (!node) return {0, 0};
            auto l = self(self, node->left);
            auto r = self(self, node->right);
            
            int sum = l.first + r.first + node->val;
            int nNode = l.second + r.second + 1;
            
            if (sum / nNode == node->val) ans++;
            
            return {sum, nNode};
        };

        dfs(dfs, root);
        return ans;
    }
};
```

## 38. **节点与其祖先之间的最大差值**

这道题目在第一篇二叉树的文章中出现过，采用的自顶向下DFS的做法，即记录从根节点到当前节点的最大值和最小值，然后更新最大差值。

现在我们尝试使用自底向上DFS的做法，即递归函数返回从叶子节点到当前节点的路径上遇到的最大值和最小值，然后更新最大差值。

```cpp
class Solution {
public:
    int maxAncestorDiff(TreeNode* root) {
        int ans = 0;

        auto dfs = [&](auto&& self, TreeNode* node) -> pair<int, int> {
            if (!node) return {INT_MAX, INT_MIN};

            auto [l_min, l_max] = self(self, node->left);
            auto [r_min, r_max] = self(self, node->right);

            int mn = min(node->val, min(l_min, r_min));
            int mx = max(node->val, max(l_max, r_max));

            ans = max(ans, max(node->val - mn, mx - node->val));
            return {mn, mx};
        };

        dfs(dfs, root);
        return ans;
    }
};
```

## 39. **第 K 大的完美二叉子树的大小**

完美二叉子树的定义：左右子树均为完美二叉树，且左右子树节点数相同。

我们定义递归函数的返回值：

- 如果子树为完美二叉树，返回该子树的节点数
- 否则，返回-1，表示不是完美二叉树

自底向上递归，先判断左右子树是否为完美二叉树，如果不是直接返回-1；否则判断左右子树节点数量是否相等，如果不等，当前子树不是完美二叉树，返回-1；否则就记录当前完美二叉树的节点数到数组perfect_trees，并返回。

当遍历完成后，全部完美二叉树的节点个数都被记录到perfect_trees中了，只需要对其按降序排序，然后返回第k个元素即可。需要注意如果完美二叉树的个数少于k个，需要返回-1。

```cpp
class Solution {
public:
    int kthLargestPerfectSubtree(TreeNode* root, int k) {
        vector<int> perfect_trees;

        auto dfs = [&](auto&& self, TreeNode* node) -> int {
            if (!node) return 0;
            int l = self(self, node->left);
            int r = self(self, node->right);

            // 不平衡就返回-1
            if (l != r || l == -1 || r == -1) return -1; 

            // 平衡就将其加入perfect_trees，并返回
            int num = 2 * l + 1;
            perfect_trees.push_back(num);
            return num;
        };
        
        dfs(dfs, root);
        // 按降序排序
        sort(perfect_trees.begin(), perfect_trees.end(), [](int a, int b)->bool{
            return a > b;
        });
        if (perfect_trees.size() < k) return -1;
        return perfect_trees[k-1];
    }
};
```

## 40. **分裂二叉树的最大乘积**

题目要求是可以断开二叉树中任意一条边，求断开后的两部分子树和的乘积。

我的思路：DFS计算出整棵树的和，然后在自底向上，对于每棵子树，都计算一下断开后的乘积，将其记录到答案中。记得将最终答案与1e9 + 7求余。

```cpp
class Solution {
public:
    int maxProduct(TreeNode* root) {
        const long long MOD = 1e9 + 7;

        // 求整棵树之和
        auto dfs_sum = [&](auto&& self, TreeNode* node) -> long long {
            if (!node) return 0;
            return self(self, node->left) + self(self, node->right) + node->val;
        };
        long long sum = dfs_sum(dfs_sum, root);
        
        long long ans = 0;
        auto dfs = [&](auto&& self, TreeNode* node) -> int {
            if (!node) return 0;
            int l = self(self, node->left);
            int r = self(self, node->right);
            int s = l + r + node->val;

            ans = max(ans, s * (sum - s));
            return s;
        };

        dfs(dfs, root);
        return ans % MOD;
    }
};
```

## 41. **任务完成时间 I**

没整明白，之后补上。

## 42. **二叉树中的最长交错路径**

在上一篇二叉树的文章中，已经介绍了自顶向下的写法，这里采用自底向上的思路。

对每个节点，我们需要知道两件事：

1. **如果下一步往左走**，能形成的最长 ZigZag 长度是多少？
2. **如果下一步往右走**，能形成的最长 ZigZag 长度是多少？

我们假设递归函数会返回一个pair：

- `first` = 从当前节点出发，**第一步往左走**能得到的最大 ZigZag 长度；
- `second` = 从当前节点出发，**第一步往右走**能得到的最大 ZigZag 长度。

对于任意一个节点node，递归获取其左子树往右走得到的长度和右子树往左走得到的长度，然后取大者更新ans。

```cpp
class Solution {
public:
    int longestZigZag(TreeNode* root) {
        int ans = 0;
        auto dfs = [&](auto&& self, TreeNode* node) -> pair<int, int> {
            if (!node) return {-1, -1};

            int lr = self(self, node->left).second + 1;
            int rl = self(self, node->right).first + 1;
            ans = max(ans, max(lr, rl));
            
            return {lr, rl};
        };

        dfs(dfs, root);
        return ans;
    }
};
```

为什么当node为空时返回 `-1` 而不是 `0`？因为后面会进行+1，对于单个节点来说边长正好是0。

## **43. 二叉树着色游戏**

没整明白，之后补上。

## 44. **另一棵树的子树**

**法一：暴力法**

先判断根节点开始的树与目标树是否相同，再递归判断subRoot是否为左子树的子树和右子树的子树，如果是上述三种情况之一就返回true。

时间复杂度为：O(n*min(n, m))，空间复杂度为O(n)

```cpp
class Solution {
    // 100. 相同的树
    bool isSameTree(TreeNode* p, TreeNode* q) {
        if (p == nullptr || q == nullptr) {
            return p == q; // 必须都是 nullptr
        }
        return p->val == q->val &&
               isSameTree(p->left, q->left) &&
               isSameTree(p->right, q->right);
    }

public:
    bool isSubtree(TreeNode* root, TreeNode* subRoot) {
        if (root == nullptr) {
            return false;
        }
        return isSameTree(root, subRoot) ||
               isSubtree(root->left, subRoot) ||
               isSubtree(root->right, subRoot);
    }
};
```

**法二：只在高度相同时匹配**

在暴力法中我们对每个节点都进行了isSameTree的判断，这是不必要的。

改变策略：在自底向上“归”的过程中只有高度与subRoot相同时才进行isSameTree的判断。

```cpp
class Solution {
    int getHeight(TreeNode* root) {
        if (!root) return 0;
        int l = getHeight(root->left);
        int r = getHeight(root->right);
        return max(l, r) + 1;
    }

    bool isSameTree(TreeNode* p, TreeNode* q) {
        if (p == nullptr || q == nullptr) {
            return p == q; // 必须都是 nullptr
        }
        return p->val == q->val &&
               isSameTree(p->left, q->left) &&
               isSameTree(p->right, q->right);
    }

public:
    bool isSubtree(TreeNode* root, TreeNode* subRoot) {
        int sub_h = getHeight(subRoot);

        // 返回node的高度 + 是否找到了subRoot
        auto dfs = [&](auto&& self, TreeNode* node) -> pair<int, bool> {
            if (!node) return {0, false};
            auto [l_h, l_found] = self(self, node->left);
            auto [r_h, r_found] = self(self, node->right);
            
            // 已经找到了subRoot，直接返回true
            if (l_found || r_found) return {0, true};
						
            int node_h = max(l_h, r_h) + 1;
            return {node_h, node_h == sub_h && isSameTree(node, subRoot)};
        };
			
        return dfs(dfs, root).second;
    }
};
```

## 44. **好叶子节点对的数量**

自底向上递归，每次返回从当前节点的所有叶子节点的距离（用一个数组）。

```cpp
class Solution {
public:
    int countPairs(TreeNode* root, int distance) {
        int ans = 0;

        auto dfs = [&](auto&& self, TreeNode* node) -> vector<int> {
            if (!node) return {};
            if (!node->left && !node->right) return {0};

            vector<int> leafs_depth;
            auto left = self(self, node->left);
            for (auto& e : left) {
                if (++e > distance) continue;
                leafs_depth.push_back(e);
            }
            auto right = self(self, node->right);
            for (auto& e : right) {
                if (++e > distance) continue;
                leafs_depth.push_back(e);
            }

            for (auto l : left) {
                for (auto r : right) {
                    ans += (l + r <= distance);
                }
            }

            return leafs_depth;
        };

        dfs(dfs, root);
        return ans;
    }
};
```

## 45. **装饰树**

根据题目要求递归构建即可。

```cpp
class Solution {
public:
    TreeNode* expandBinaryTree(TreeNode* root) {
        if (root->left) {
            root->left = new TreeNode(-1, 
	            expandBinaryTree(root->left), nullptr);
        }
        if (root->right) {
            root->right = new TreeNode(-1, 
	            nullptr, expandBinaryTree(root->right));
        }

        return root;
    }
};
```

# 二、**自底向上 DFS：删点**

## 46. **二叉树剪枝**

自底向上DFS，如果当前节点的左右子树中均没有0，且当前节点也没有0的话，直接返回nullptr。

```cpp
class Solution {
public:
    TreeNode* pruneTree(TreeNode* root) {
        if (!root) return nullptr;
        root->left = pruneTree(root->left);
        root->right = pruneTree(root->right);
        if (!root->left && !root->right && !root->val) {
            return nullptr;
        }
        return root;
    }
};
```

## 47. **删除给定值的叶子节点**

这道题目需要注意：在删除叶子节点后，该节点的父节点可能变成新的叶子节点，如果其值也等于target的话，需要继续删除。

所以这道题是典型的自底向上DFS，先分别递归删除左右子树中的目标叶子节点，如果当前节点变为新的叶子节点且值为target，返回nullptr，表示当前节点也被删除了。

```cpp
class Solution {
public:
    TreeNode* removeLeafNodes(TreeNode* root, int target) {
        if (!root) return nullptr;
        
        root->left = removeLeafNodes(root->left, target);
        root->right = removeLeafNodes(root->right, target);

        if (!root->left && !root->right && target == root->val) {
            return nullptr;
        }
        return root;
    }
};
```

## 48. **删点成林**

题目要求删除二叉树中全部值出现在数组to_delete中的节点，删除节点可能造成树断裂成森林，返回该森林。

还是自底向上DFS的思路，先递归删除左右子树中的目标节点，最后再检查当前节点。

```cpp
class Solution {
public:
    vector<TreeNode*> delNodes(TreeNode* root, vector<int>& to_delete) {
        unordered_set<int> s(to_delete.begin(), to_delete.end());
        vector<TreeNode*> ans;

        auto dfs = [&](auto&& self, TreeNode* node) -> TreeNode* {
            if (!node) return nullptr;

            node->left = self(self, node->left);
            node->right = self(self, node->right);

            if (s.contains(node->val)) {    
                if (node->left) ans.push_back(node->left);
                if (node->right) ans.push_back(node->right);
                return nullptr;
            }
            return node;
        };

        if (dfs(dfs, root)) ans.push_back(root);
        return ans;
    }
};
```