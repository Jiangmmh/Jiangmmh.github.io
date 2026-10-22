# LeeteCode-树

# 十、创建二叉树

## 14. **最大二叉树**

根据题目给出的构建方法，递归构建即可：

- 遍历nums当前范围，找到最大值，以其作为根节点
- 然后递归构建左右子树

```cpp
class Solution {
    TreeNode* buildMaxTree(vector<int>& nums, int l, int r) {
        if (l > r) return nullptr;
        if (l == r) return new TreeNode(nums[l]);

        int max_idx = l;
        for (int i = l+1; i <= r; i++) {
            if (nums[max_idx] < nums[i]) {
                max_idx = i;
            }
        }

        auto root = new TreeNode(nums[max_idx]);
        root->left = buildMaxTree(nums, l, max_idx-1);
        root->right = buildMaxTree(nums, max_idx+1, r);

        return root;
    }
public:
    TreeNode* constructMaximumBinaryTree(vector<int>& nums) {
        return buildMaxTree(nums, 0, nums.size()-1);
    }
};
```

## 15. **最大二叉树 II**

与上一题不同，这题给出的是由某个数组a，按上题的方法构建的最大二叉树root，以及一个值val，现在假设将val添加到数组a的末尾，得到新数组b，要求输出由数组b构建出来的最大树。

思路：由于val存放于数组的尾部，所以在新的最大树中，val节点要么是根节点的父节点，要么在右子树中。

时间复杂度：O(n)

```cpp
class Solution {
public:
    TreeNode* insertIntoMaxTree(TreeNode* root, int val) {
		    // 保存父节点，方便插入val节点
        TreeNode* parent = nullptr;
        TreeNode* cur = root;
        while (cur) {
            if (val > cur->val) {
                if (!parent) {
                    return new TreeNode(val, root, nullptr);
                }
                TreeNode* node = new TreeNode(val, cur, nullptr);
                parent->right = node;
                return root;
            } else {
                parent = cur;
                cur = cur->right;
            }
        }
        parent->right = new TreeNode(val);
        return root;
    }
};
```

## 16. **前序遍历构造二叉搜索树**

先序序列的特点，序列的第一个元素为根节点的值，之后先是左子树序列，然后是右子树序列。因为该树为BST树，所以从第二个元素开始向后遍历，**第一个遇到的比根节点值大的节点，就是右子树的根节点**，利用这一特性，我们可以划分出左子树序列和右子树序列，递归构建左右子树即可。

```cpp
class Solution {
    TreeNode* buildBST(vector<int>& nums, int l, int r) {
        if (l > r) return nullptr;

        auto root = new TreeNode(nums[l]);

        int i = l + 1;
        while (i < r + 1 && nums[i] <= nums[l]) i++;
        root->left = buildBST(nums, l+1, i-1);
        root->right = buildBST(nums, i, r);
        
        return root;
    }
public:
    TreeNode* bstFromPreorder(vector<int>& preorder) {
        return buildBST(preorder, 0, preorder.size()-1);
    }
};
```

**优化：使用二分法搜索右子树根节点**

```scala
class Solution {
    TreeNode* buildBST(vector<int>& nums, int l, int r) {
        if (l > r) return nullptr;

        auto root = new TreeNode(nums[l]);

        int i = l+1, j = r+1;
        while (i < j) {
            int mid = i + (j - i) / 2;
            // 找到第一个大于nums[l]的元素
            if (nums[mid] <= nums[l]) {
                i = mid + 1;
            } else {
                j = mid;
            }
        }

        root->left = buildBST(nums, l+1, i-1);
        root->right = buildBST(nums, i, r);

        return root;
    }
public:
    TreeNode* bstFromPreorder(vector<int>& preorder) {
        return buildBST(preorder, 0, preorder.size()-1);
    }
};
```

## 17.

题目来自灵神的题单：https://leetcode.cn/discuss/post/3142882/fen-xiang-gun-ti-dan-lian-biao-er-cha-sh-6srp/。

在做时带着问题去做下面的题目：

一般来说，DFS 的递归边界是空节点。在什么情况下，要额外把叶子节点作为递归边界？
在什么情况下，DFS 需要有返回值？什么情况下不需要有返回值？
在什么情况下，题目更适合用自顶向下的方法解决？什么情况下更适合用自底向上的方法解决？

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
        auto dfs = [&](this auto&& dfs, TreeNode* node) -> void {
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

思路：dfs遍历，使用一个哈希set记录不同节点值

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

        auto dfs = [&](auto&& self, TreeNode* node) -> void {
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

        auto dfs = [&](auto&& self, TreeNode* node) -> void {
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

        auto dfs = [&](auto&& self, TreeNode* node, int depth) -> void {
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
        auto dfs = [&](auto&& self, TreeNode* node, int depth) {
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

dfs遍历整棵树，使用一个参数num记录当前路径上的数字，等到达叶子节点时将完整数字加到结果中。

```cpp
class Solution {
public:
    int sumNumbers(TreeNode* root) {
        int ans = 0;
        auto dfs = [&](auto&& self, TreeNode* node, int num) {
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
        auto dfs = [&](auto&& self, TreeNode* node, int depth) {
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
        
        auto dfs = [&](auto&& self, TreeNode* node, int preMax) -> void {
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
        
        auto dfs = [&](auto&& self, TreeNode* node, TreeNode* p, TreeNode* gp) -> void {
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
        auto dfs = [&](auto&& self, TreeNode* node, string s) {
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
        auto dfs = [&](auto&& self, TreeNode* node, string s) {
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

        auto dfs = [&](auto&& self, TreeNode* node, int preMax, int preMin) -> void {
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
        auto dfs = [&](auto&& self, TreeNode* node, int num) -> void {
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
				
        auto dfs = [&](auto&& self, TreeNode* node, int cur_depth) -> void {
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

        auto dfs = [&](auto&& self, TreeNode* node, int length, bool dir_left) -> void {
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

# 三、**自底向上 DFS（后序遍历）**

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
- 准备一个初值为true的bool变量记录答案
- 遍历整棵二叉树，如果发现存在节点值不等于rootval，则将ans置为false
- 最后返回ans即可

```cpp
class Solution {
public:
    bool isUnivalTree(TreeNode* root) {
        // 树非空
        int rootval = root->val;
        bool ans = true;

        auto dfs = [&](auto&& self, TreeNode* node) -> void {
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
> 

思路：结合相同的树和对称二叉树的思路，直接得到答案

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

题目要求：略。

思路：直接递归搜索树cloned，从中找到值与target相同的节点，返回其指针即可。

```cpp
class Solution {
public:
    TreeNode* getTargetCopy(TreeNode* original, TreeNode* cloned, TreeNode* target) {
        TreeNode* ans = nullptr;
        
        auto dfs = [&](auto&& self, TreeNode* c) -> void {
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

编写一个求二叉树最大深度的函数，分别计算出左右子树的深度，要求差值不超过1，然后递归处理左右子树。

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

解法一采用是自顶向下的思路，我们会反复调用depth求树的深度，这些求深度的操作很多都是重复的、不必要的。因此考虑自底向上，在判断子树是否平衡的同时，不断将当前深度往上传，而不是每次都从上到下求深度。

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
            if (l == -1) return -1;

            // 判断右子树是否平衡+求深度
            int r = self(self, node->right);
            if (r == -1) return -1;

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

        auto l = invertTree(root->left);
        auto r = invertTree(root->right);

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
public:
    TreeNode* mergeTrees(TreeNode* root1, TreeNode* root2) {
        if (!root1 && !root2) return nullptr;
        if (!root1 && root2) return root2;
        if (!root2 && root1) return root1;

        if (root2) root1->val += root2->val;

        root1->left = mergeTrees(root1->left, root2->left);
        root1->right = mergeTrees(root1->right, root2->right);

        return root1;
    }
};
```

## 32. **计算布尔二叉树的值**

按题目要求模拟就行，无需多言。

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

思路：递归求树的和，在递归过程中使用哈希表mp记录所有子树的和出现的次数，并使用变量cnt记录所遇到的出现次数最多的子树和。

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

# 四、**自底向上 DFS：删点**

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

