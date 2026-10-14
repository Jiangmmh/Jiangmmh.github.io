---
title: "Leetecode 二叉树(一)-遍历&自顶向下DFS"
date: '2026-10-14T22:02:01+08:00'
draft: false
tags: ["二叉树"]
categories: [Leetecode]
---

题目来自灵神的题单：https://leetcode.cn/discuss/post/3142882/fen-xiang-gun-ti-dan-lian-biao-er-cha-sh-6srp/。

**在做时带着问题去做下面的题目：**
- 一般来说，DFS 的递归边界是空节点。
- 在什么情况下，要额外把叶子节点作为递归边界？
- 在什么情况下，DFS 需要有返回值？什么情况下不需要有返回值？
- 在什么情况下，题目更适合用自顶向下的方法解决？
- 什么情况下更适合用自底向上的方法解决？

**C++不同标准下，支持递归的Lambda表达式写法：**
1. C++11标准起支持
```c++
#include <functional>

std::function<void(TreeNode*, string)> dfs = [&](TreeNode* node, string s) {
    if (!node) return;
    // ...
    dfs(node->left, s);   // 直接用 dfs，因为 dfs 已经声明了
    dfs(node->right, s);
};

dfs(root, "");
```

2. C++14标准支持
```c++
auto dfs = [&](auto&& self, TreeNode* node, string s) -> void {
    if (!node) return;
    // ...
    self(self, node->left, s);   // 把自己作为参数传进去
    self(self, node->right, s);
};

dfs(dfs, root, "");   // 调用时也要把自己传进去
```

在我的解法实现中采用的是C++14标准的写法。

# 一、遍历二叉树

## 1. **二叉树的前序遍历**

**法一：DFS**

树的先序遍历的顺序是：根-左-右

因为树本身就是递归定义的，即树的子树本身就是一棵树。

```cpp
class Solution {
    vector<int> ans;
    void dfs(TreeNode* root) {
        if (root) {
            ans.push_back(root->val);
            dfs(root->left);
            dfs(root->right);
        }
    }
public:
    vector<int> preorderTraversal(TreeNode* root) {
        dfs(root);
        return ans;
    }
};
```

**法二：非递归法**

使用一个栈来实现，对于每个节点先处理当前节点（中），然后依次压入右子树和左子树，根据栈的特点，得到的顺序是先左后右。

```cpp
class Solution {
public:
    vector<int> preorderTraversal(TreeNode* root) {
        vector<int> ans;
        if (!root) return ans;
				
        stack<TreeNode*> st;
        st.push(root);
        
        while (!st.empty()) {
            auto node = st.top(); st.pop();
            if (node) {
                ans.push_back(node->val);
                if (node->right) st.push(node->right);
                if (node->left) st.push(node->left);
            }
        }
        return ans;
    }
};
```

## 2. **二叉树的中序遍历**

**法一：DFS**

访问顺序为：左-中-右。递归写法非常简单，调整一下访问根节点的语句的位置即可。

时间复杂度：O(n)，空间复杂度：O(n)

```cpp
class Solution {
    vector<int> ans;
    void dfs(TreeNode* root) {
        if (root) {
            dfs(root->left);
            ans.push_back(root->val);
            dfs(root->right);
        }
    }
public:
    vector<int> inorderTraversal(TreeNode* root) {
        dfs(root);
        return ans;
    }
};
```

**法二：非递归-使用栈模拟中序遍历**

为了实现左-中-右的遍历顺序，从根节点开始不断向左子树走，将沿途的根节点保存到栈中，直至左子树为空。此时弹出栈顶节点（最近的根节点）并访问，然后以右子树为根节点执行相同的操作。

时间复杂度：O(n)，空间复杂度：O(n)

```cpp
class Solution {
    vector<int> ans;
public:
    vector<int> inorderTraversal(TreeNode* root) {
        stack<TreeNode*> st;
        auto cur = root;
        while (cur || !st.empty()) {
            while (cur) {
                st.push(cur);
                cur = cur->left;
            }

            cur = st.top(); st.pop();
            ans.push_back(cur->val);
            cur = cur->right;
        }
        return ans;
    }
};
```

**法三：Morris遍历**

> 
> 
> 
> 关键问题：能不能做到 O(1) 空间？不能写递归，也不能用栈模拟递归。
> 

**Morris 遍历**是一种**不用栈、不用递归**就能实现二叉树中序遍历的算法，空间复杂度 **O(1)**。它的核心思想是**利用叶子节点的空指针（线索）临时指向中序后继**，从而在遍历完后能“回到”祖先节点。

思路：

- `root` 的前驱 = 左子树中最后被访问的节点 = 左子树里最右的那个。
- 第一次到 `root` 时，`prev->right` 本来是 `nullptr`（因为 `prev` 是最右节点，没有右孩子）。Morris 把 `prev->right = root`，建立一条**临时线索**，然后进入左子树。
- 等左子树遍历完，会顺着这条线索**回到 `root`**。这时 `prev->right` 已经等于 `root` 了。
- 此时将root的值压入结果数组ans中

需要注意当遍历到叶子节点后通过线索返回根节点时，不要重复进行索引构建工作，而是断开索引（恢复原状）。

时间复杂度：O(n)，空间复杂度：O(1)

```cpp
class Solution {
    vector<int> ans;
public:
    vector<int> inorderTraversal(TreeNode* root) {
        while (root) {
            if (root->left) {
                // 从左子树根节点开始，不断向右走（中序的特点）
                TreeNode* prev = root->left;
                // 这里防止二次访问root，多加一个条件
                while (prev->right && prev->right != root) {
                    prev = prev->right;
                }

                // 第一次访问root，加上其前驱到它的线索
                if (prev->right == nullptr) {
                    prev->right = root;
                    root = root->left;
                    continue;
                }
								
								// 如果是第二次访问root
                prev->right = nullptr;
            } 
            ans.push_back(root->val);
            root = root->right;
        }
        return ans;
    }
};
```

## 3. **二叉树的后序遍历**

后序遍历的顺序为左-右-中。

**法一：DFS**

```cpp
class Solution {
    vector<int> ans;
void dfs(TreeNode* root) {
        if (root) {
            dfs(root->left);
            dfs(root->right);
            ans.push_back(root->val);
        }
    }
public:二叉树的后序遍历
    vector<int> postorderTraversal(TreeNode* root) {
        dfs(root);
        return ans;
    }
};
```

**法二：非递归写法**

```cpp
class Solution {
    vector<int> ans;
public:
    vector<int> postorderTraversal(TreeNode* root) {
        // 左右中 = ～中右左
        // 而先序遍历的顺序为中左右
        if (!root) return ans;
        stack<TreeNode*> st;
        st.push(root);
        while (!st.empty()) {
            auto node = st.top(); st.pop();
            ans.push_back(node->val);
            if (node->left) st.push(node->left);
            if (node->right) st.push(node->right);
        }

        reverse(ans.begin(), ans.end());
        return ans;
    }
};
```

## 4. **叶子相似的树**

思路：从根节点开始，按顺序遍历两颗树（仅记录叶子节点）。然后比较遍历结果。

C++中的vector支持直接进行比较。

注意这里的lambda表达式的定义，这是C++14标准提出的。

```cpp
class Solution {
    vector<int> leafs(TreeNode* root) {
        vector<int> ans;
        auto dfs = & -> void {
            if (!node) return ;        
            if (!node->left && !node->right) {  // 叶子节点
                ans.push_back(node->val);
                return ;
            }
            dfs(node->left);
            dfs(node->right);
        };
        dfs(root);
        return ans;
    }
public:
    bool leafSimilar(TreeNode* root1, TreeNode* root2) {
        return leafs(root1) == leafs(root2);
    }
};
```

## 5. **开幕式焰火**

翻译：统计不同节点值的个数。

思路：DFS遍历，使用一个哈希set记录不同节点值

```cpp
class Solution {
public:
    int numColor(TreeNode* root) {
        unordered_set<int> s;
        auto dfs = [&] (auto&& self, TreeNode* node) -> void {
            if (node) {
                s.insert(node->val);
                self(self, node->left);
                self(self, node->right);
            }
        };

        dfs(dfs, root);
        return s.size();
    }
};
```

## 6. **左叶子之和**

dfs查看每个节点的左子树是否为叶子，如果是叶子就将其值加到ans。

```cpp
class Solution {
public:
    int sumOfLeftLeaves(TreeNode* root) {
        int ans = 0;

        auto dfs = & -> void {
            if (!node) return ;
            
            TreeNode* left = node->left;
            if (left && !left->left && !left->right) {
                ans += left->val;
            }

            self(self, node->left);
            self(self, node->right);
        };

        dfs(dfs, root);
        return ans;
    }
};
```

## 7. **二叉树中第二小的节点**

按照题目给出的二叉树的特点，整个二叉树的最小值一定为根节点的值，我们需要遍历二叉树找到**第二小**的节点。这里要注意一个问题：该二叉树所有节点的值可能相同，该情况下应当返回-1。

思路：将结果变量ans初始化为-1，使用dfs遍历整棵树，只有在节点值与根节点值不同时才考虑更新结果。

- 如果ans为-1，说明还未记录，用当前节点值更新ans
- 否则，取当前节点值和ans的小者更新ans

最后递归遍历左右子树即可。

```cpp
class Solution {
public:
    int findSecondMinimumValue(TreeNode* root) {
        int ans = -1;
        int rootval = root->val; // 最小值一定是根节点的值

        auto dfs = & -> void {
            if (!node) return ;

            // 只有与根节点不同才考虑
            if (node->val != rootval) { 
                if (ans == -1)   // 如果ans还未确定，存储比根节点大的值
                    ans = node->val;
                else             // 从比根节点大的值中找最小的
                    ans = min(ans, node->val);
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

# 二、**自顶向下 DFS（先序遍历）**
下列题目主要是在「递」的过程中维护值。

## 8. **二叉树的最大深度**

**法一：自底向上**

先递归得到左右子树各自的最大深度，然后取大者+1，就得到了当前这个二叉树的最大深度。

所谓自底向上就是指先得到子树的答案，然后根据子树的答案求解整棵二叉树的答案。

时间复杂度：O(n)，空间复杂度：O(n)

```cpp
class Solution {
public:
    int maxDepth(TreeNode* root) {
        if (!root) return 0;
        int max_l = maxDepth(root->left);
        int max_r = maxDepth(root->right);
        return max(max_l, max_r) + 1;
    }
};
```

**法二：自顶向下**

从根节点开始不断往子树去求解答案。

时间复杂度：O(n)，空间复杂度：O(n)

```cpp
class Solution {
public:
    int maxDepth(TreeNode* root) {
        int ans = 0;

        auto dfs = & -> void {
            if (!node) return ;
            ans = max(ans, depth);
            self(self, node->left, depth+1);
            self(self, node->right, depth+1);
        };
        
        dfs(dfs, root, 1);
        return ans;
    }
};
```

## 9. **二叉树的最小深度**

**法一：自底向上**

有这么几种情况：

- 当前节点为空，直接返回0
- 左子树为空，右子树不为空，返回minDepth(root->right) + 1
- 右子树为空，左子树不为空，返回minDepth(root->left) + 1
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

**法二：自顶向下**

使用一个变量ans记录结果，在dfs过程中使用一个参数depth记录当前的层数，当到达叶子节点时，如果depth小于ans，就更新ans。随后递归处理左右子树。

```cpp
class Solution {
public:
    int minDepth(TreeNode* root) {
		    if (!root) return 0;
		    
        int ans = INT_MAX;
        auto dfs = & {
            if (!node || depth >= ans) return ; // 剪枝
            if (!node->left && !node->right) {
                ans = min(ans, depth);
                return ;
            }
            self(self, node->left, depth+1);
            self(self, node->right, depth+1);
        };
        dfs(dfs, root, 1);
        return ans;
    }
};
```

## 10. **路径总和**

dfs遍历整棵树，分这么几种情况：

- 当前节点为空，直接返回false
- 当前节点为叶子，将当前节点的值与targetSum进行比较，如果相等说明找到了目标路径，返回true，否则返回false
- 递归处理左右子树

```cpp
class Solution {
public:
    bool hasPathSum(TreeNode* root, int targetSum) {
        if (!root) return false;
        if (!root->left && !root->right) {
            return root->val == targetSum;
        } 
        targetSum -= root->val;
        return hasPathSum(root->left, targetSum) 
            || hasPathSum(root->right, targetSum); 
    }
};
```

## 11. **求根节点到叶节点数字之和**

DFS遍历整棵树，使用一个参数num记录当前路径上的数字，等到达叶子节点时将完整数字加到结果中。

```cpp
class Solution {
public:
    int sumNumbers(TreeNode* root) {
        int ans = 0;
        auto dfs = & {
            if (!node) return ;
            
            num = num * 10 + node->val;
            
            if (!node->left && !node->right) {
                ans += num;
                return ;
            }
            
            self(self, node->left, num);
            self(self, node->right, num);
        };
        dfs(dfs, root, 0);
        return ans;
    }
};
```

## 12. **二叉树的右视图**

给定一个二叉树的根节点，要求返回该树每层最右侧节点组成的序列。

**法一：层次遍历**

BFS遍历这颗二叉树，仅记录每层最后一个节点的值。

**法二：自顶向下dfs**

思路：每次向下递归时优先向右走，并记录每层第一次被访问的元素。

- 使用一个变量max_depth（初值为0）记录已经已访问过的最大层数
- 通过参数depth记录当前层数，只有第一次访问该层时才记录结果（depth > max_depth），并更新max_depth。

时间复杂度：O(n)，空间复杂度：O(n)

```cpp
class Solution {
public:
    vector<int> rightSideView(TreeNode* root) {
        vector<int> ans;
        int max_depth = 0;
        auto dfs = & {
            if (!node) return;
            if (depth > max_depth) {
                ans.push_back(node->val);
                max_depth = depth;
            }

            self(self, node->right, depth+1);
            self(self, node->left, depth+1);
        };
        dfs(dfs, root, 1);
        return ans;
    }
};
```

## 13. **统计二叉树中好节点的数目**

在dfs时，使用参数preMax记录从根节点到当前节点的路径上遇到的最大值，如果当前节点的值大于等于preMax就将其记录到结果变量ans中，更新preMax，然后递归处理左右子树。

```cpp
class Solution {
public:
    int goodNodes(TreeNode* root) {
        int ans = 0;
        
        auto dfs = & -> void {
            if (!node) return;
            if (node->val >= preMax) {
                ans++;
                preMax = node->val;
            }

            self(self, node->left, preMax);
            self(self, node->right, preMax);
        };

        dfs(dfs, root, INT_MIN);
        return ans;
    }
};
```

## 14. **祖父节点值为偶数的节点和**

DFS遍历这颗二叉树，有这样几种情况：

- 当前节点为空，直接返回
- 祖父节点存在，判断其值是否为偶数，如果是就加入ans，然后更新祖父节点和父亲节点，递归处理左右子树
- 祖父节点不存在，父亲节点存在，将祖父更新为父亲，将父亲更新为当前节点，递归处理左右子树

具体实现：使用两个指针p（parent）和gp（grand parent）记录父亲节点和祖父节点。

```cpp
class Solution {
public:
    int sumEvenGrandparent(TreeNode* root) {
        int ans = 0;
        
        auto dfs = & -> void {
            if (!node) return;
            if (gp) {
                // 祖父存在
                if (gp->val % 2 == 0) ans += node->val;
            }
            gp = p;
            p = node;
            self(self, node->left, p, gp);
            self(self, node->right, p, gp);
        };

        dfs(dfs, root, nullptr, nullptr);
        return ans;
    }
};
```

## 15. **从叶结点开始的最小字符串**

**法一：自顶向下 + 排序**

最朴素的思路：先DFS遍历整棵二叉树，记录**全部**可能的字符串（在叶子节点反转），然后对这些字符串按字典序进行排序，最后返回最小的字符串。

时间复杂度为O(n)，空间复杂度为O(n)

```cpp
class Solution {
public:
    string smallestFromLeaf(TreeNode* root) {
        vector<string> path;
        auto dfs = & {
            if (!node) return;
            
            s += node->val + 'a';
						
            if (!node->left && !node->right) {
                reverse(s.begin(), s.end());
                path.push_back(s);
                return;
            }
            self(self, node->left, s);
            self(self, node->right, s);
        };

        dfs(dfs, root, "");
        sort(path.begin(), path.end());
        return path[0];
    }
};
```

**法二：优化-从叶子开始构造**

从叶子开始构造字符串，然后使用一个变量smallest记录当前遇到的最小字典序的字符串，避免了记录全部字符串到vector，以及最后的排序操作。

时间复杂度为O(n)，空间复杂度为O(n)。

```cpp
class Solution {
public:
    string smallestFromLeaf(TreeNode* root) {
        string smallest = "~"; // ～的ASCII超过全部小写字母
        auto dfs = & {
            if (!node) return;

            s = char(node->val + 'a') + s; 
            
            if (!node->left && !node->right) {
                smallest = min(smallest, s);
                return;
            }
            self(self, node->left, s);
            self(self, node->right, s);
        };

        dfs(dfs, root, "");
        return smallest;
    }
};
```

## 16. **节点与其祖先之间的最大差值**

这里的最大差值是求绝对值后的结果。因此只需在DFS遍历过程中记录祖先节点的最大值和最小值就可以计算出从根节点到当前阶段为止的最大差值。

时间复杂度为O(n)，空间复杂度为O(n)。

```cpp
class Solution {
public:
    int maxAncestorDiff(TreeNode* root) {
        int ans = INT_MIN;
        int rootval = root->val;

        auto dfs = & -> void {
            if (!node) return ;

            int x = node->val;
            ans = max(ans, abs(preMax - x));
            ans = max(ans, abs(preMin - x));

            preMax = max(preMax, x);
            preMin = min(preMin, x);

            self(self, node->left, preMax, preMin);
            self(self, node->right, preMax, preMin);
        };

        dfs(dfs, root, rootval, rootval);
        return ans;
    }
};
```

## 17. **从根到叶的二进制数之和**

简单题，DFS遍历得到全部从根到叶子表示的数值，将它们加到sum即可。

```cpp
class Solution {
public:
    int sumRootToLeaf(TreeNode* root) {
        int sum = 0;
        auto dfs = & -> void {
            if (!node) return ;
            num = (num << 1) + node->val;
            if (!node->left && !node->right) sum += num;

            self(self, node->left, num);
            self(self, node->right, num);
        };

        dfs(dfs, root, 0);
        return sum;
    }
};
```

## 18. **在二叉树中增加一行**

在第depth行增加一层节点。思路：DFS遍历到第depth-1层时，创建两个值为val的节点，将其插入。只有depth==1时是一个特例，创建节点并将根节点作为该节点的左子树，然后返回该节点。

```cpp
class Solution {
public:
    TreeNode* addOneRow(TreeNode* root, int val, int depth) {
        if (depth == 1) {
            auto node = new TreeNode(val, root, nullptr);
            return node;
        }
				
        auto dfs = & -> void {
            if (!node) return ;
            if (cur_depth == depth-1) {
                auto leftNode = new TreeNode(val);
                auto rightNode = new TreeNode(val);

                leftNode->left = node->left;
                node->left = leftNode;

                rightNode->right = node->right;
                node->right = rightNode;
                return ;
            }
            self(self, node->left, cur_depth+1);
            self(self, node->right, cur_depth+1);
        };

        dfs(dfs, root, 1);
        return root;
    }
};
```

## 19. **二叉树中的最长交错路径**

> 注意：最长交错路径不要求从根节点开始，也可以从其他节点开始！
> 

使用ans记录最长交错路径长度，在DFS的参数重，使用length记录到当前节点所经过的交错路径长度，dir_left表示上一次的方向是否向左。

对于一个节点：

- 上一步是向左走的：
    - 右子树非空，向右递归，length+1，方向向右
    - 左子树非空，向左递归，length置为0，方向向左
- 上一步是向右走的：
    - 左子树非空，向左递归，length+1，方向向左
    - 右子树非空，向右递归，length置为0，方向向右

```cpp
class Solution {
public:
    int longestZigZag(TreeNode* root) {
        int ans = 0;

        auto dfs = & -> void {
            if (!node) return ;
            ans = max(ans, length);
            if (dir_left) {
                // 上一次为向左走
                if (node->right) self(self, node->right, length+1, false);  // 继续向右
                if (node->left)  self(self, node->left, 1, true);           // 重新开始向左
            } else {
                // 上一次为向右走
                if (node->left) self(self, node->left, length+1, true);     // 继续向左
                if (node->right) self(self, node->right, 1, false);         // 重新开始向右
            }
        };

        if (root->left) dfs(dfs, root->left, 1, true);
        if (root->right) dfs(dfs, root->right, 1, false);
        return ans;
    }
};
```

## 20. **翻转二叉树以匹配先序遍历**

有点难度，暂时不做，后序补齐。
