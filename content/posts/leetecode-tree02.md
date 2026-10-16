---
title: "Leetecode 二叉树(二)"
date: '2026-10-16T11:20:25+08:00'
draft: false
tags: [二叉树, 自底向上DFS]
categories: [Leetecode]
---
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

## 34.