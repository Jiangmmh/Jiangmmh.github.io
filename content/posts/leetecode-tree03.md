---
title: "Leetecode 二叉树(三)"
date: '2026-10-22T16:17:04+08:00'
draft: false
tags: [二搜索叉树, 中序遍历, 二叉树的直径, 回溯]
categories: [Leetecode]
---

# **一、有递有归**

## 49. **把二叉搜索树转换为累加树**

这道题目要求将BST右侧的节点之和加到当前节点。

使用一个全局变量s记录当前和，按右-中-左的顺序遍历BST，将s加到当前节点中。

```cpp
class Solution {
public:
    TreeNode* convertBST(TreeNode* root) {
        int s = 0;
        // 返回子树之和
        auto dfs = [&](auto&& self, TreeNode* node) {
            if (!node) return ;

            self(self, node->right);
            s += node->val;
            node->val = s;
            self(self, node->left);
        };

        dfs(dfs, root);
        return root;
    }
};
```

## 50. **具有所有最深节点的最小子树**

> 二叉树深度和高度的区别：**深度**指从**根节点到某个节点的路径长度**（边数），或节点层数（根为第1层时）。**高度**指从**某个节点到其最远叶子节点的路径长度**（边数）。
> 

这道题目的题目描述有点stupid，翻译一下：找最深节点的最近公共祖先（LCA）。

我们可以使用DFS递归实现，在递的过程中记录当前层次的深度，并通过全局变量max_depth记录最大深度，在归的过程中如果发现左右子树的深度相同且等于全局最大深度，当前节点就是满足条件的子树。

```cpp
class Solution {
public:
    TreeNode* subtreeWithAllDeepest(TreeNode* root) {
        // 在递的过程中计算最大深度，在归的过程中找最深叶子的LCA
        int max_depth = -1;
        TreeNode* ans;
        
        // 返回左右子树中叶子的最大
        auto dfs = [&](auto&& self, TreeNode* node, int depth) -> int {
            if (!node) {
                // max_depth会记录全部叶子中的最大深度
                max_depth = max(max_depth, depth);
                return depth;
            }

            int l = self(self, node->left, depth+1);
            int r = self(self, node->right, depth+1);

            if (l == r && l == max_depth) ans = node;
            return max(l, r);
        };

        dfs(dfs, root, 0);
        return ans;
    }
};
```

## 51. **根到叶路径上的不足节点**

思路：“递”计算路径和，“归”判断不足节点并删除

- 在“递”的过程中：不断用limit减去当前节点的值（等价于计算从根到叶子的路径和）。
- 在“归”的过程中：
    - 当遇到叶子时判断limit是否大于0，如果是表示当前路径和小于limit，是需要被删除的不足节点，返回nullptr；否则不需要被删除，返回当前节点。
    - 对于非叶子节点，如果只有其左右子树均被删除时才选择将其删除

```cpp
class Solution {
public:
    TreeNode* sufficientSubset(TreeNode* root, int limit) {
        if (!root) return nullptr;

        limit -= root->val;
        if (!root->left && !root->right) {
            return limit > 0 ? nullptr : root;
        }
				
        root->left = sufficientSubset(root->left, limit);
        root->right = sufficientSubset(root->right, limit);
				
				// 只有左右子树均是不足节点才删除
        return root->left || root->right ? root : nullptr;
    }
};
```

# 二、**二叉树的直径**

## 52. **二叉树的直径**

思路：自底向上DFS遍历二叉树，先求出左右子树的最大高度，用两者之和（直径）更新ans，最后返回当前子树的最大高度，即左右子树高度较大者 + 1。

```cpp
class Solution {
public:
    int diameterOfBinaryTree(TreeNode* root) {
        int ans = 0;
        
        // 返回子树node到最深叶子的边长
        auto dfs = [&](auto&& self, TreeNode* node) -> int {
            if (!node) return 0;

            int l = self(self, node->left);
            int r = self(self, node->right);

            ans = max(ans, l + r);
            return max(l, r) + 1;
        };

        dfs(dfs, root);
        return ans;
    }
};
```

## 53. **最长同值路径**

自底向上DFS，在归的过程中计算最长同值路径：

- 返回值表示子树node下方中与根节点值相同且连续的节点数（不包括node节点）
- l和r为左右子树递归结果+1，表示算上当前节点的最长路径
- 如果当前节点的值与左子树的值不同，左子树的最长同值路径设置为0
- 如果当前节点的值与右子树的值不同，右子树的最长同值路径设置为0

```cpp
class Solution {
public:
    int longestUnivaluePath(TreeNode* root) {
        int ans = 0;

        // dfs返回子树node下方中与根节点值相同且相连的连续节点数（不包括node节点）
        auto dfs = [&](auto&& self, TreeNode* node) -> int {
            if (!node) return -1;

            // 表示算上当前节点
            int l = self(self, node->left) + 1;
            int r = self(self, node->right) + 1;
            
            if (l && node->left->val != node->val) l = 0;
            if (r && node->right->val != node->val) r = 0;
            
            ans = max(ans, l + r);
            return max(l, r);
        };

        dfs(dfs, root);
        return ans;
    }
};
```

## 54. **二叉树中的最大路径和**

自底向上DFS，先分别递归计算左右子树的路径和，然后与当前节点值求和，并更新ans。

注意：这里的路径不要求必须经过叶子节点，因此如果子树的路径和小于0，需要将其断开，即返回0。

```cpp
class Solution {
public:
    int maxPathSum(TreeNode* root) {
        int ans = INT_MIN;

        auto dfs = [&](auto&& self, TreeNode* node) -> int {
            if (!node) return 0;
            int sum_left = self(self, node->left);
            int sum_right = self(self, node->right);
            
            // 记录以当前节点为根节点的最大路径和
            ans = max(ans, sum_left + sum_right + node->val);
            
            // dfs返回的是以当前节点为根节点的，最大直径和
            return max(max(sum_left, sum_right) + node->val, 0);
        };
        dfs(dfs, root);
        return ans;
    }
};
```

## 55. **感染二叉树需要的总时间**

将问题转化一下：感染二叉树所需的总时间 = 从值为start的节点到其他任意节点的最大长度。

> 归的过程中需要根据返回值确定start的位置。
> 

本题算法如下：

1. 递归时，除了返回当前子树的最大链长，还需要返回一个布尔值，表示当前子树是否包含 start。
2. 如果当前节点是空节点，返回 0 和 false。
3. 设左子树的返回的链长为 lLen，右子树返回的链长为 rLen。
4. 如果当前节点值等于 start，初始化答案为 max(lLen,rLen)，即子树 start 的最大深度。然后返回 1 和 true。
5. 如果左右子树都不包含 start，返回 max(lLen,rLen)+1。
6. 如果左子树或右子树包含 start，像计算直径那样，用 lLen+rLen 更新答案的最大值。如果左子树包含 start，则返回 lLen 和 true，否则返回 rLen 和 true。这种返回方式可以保证 lLen+rLen 一定是端点为 start 的直径长度。

```cpp
class Solution {
public:
    int amountOfTime(TreeNode* root, int start) {
        int ans = 0;
        
        auto dfs = [&](auto&& self, TreeNode* node) -> pair<int, bool> {
            if (!node) return {0, false};

            auto [l_len, l_found] = self(self, node->left);
            auto [r_len, r_found] = self(self, node->right);

            // 如果当前节点就是start节点，更新ans为最大高度，向上返回1
            if (node->val == start) {
                ans = max(l_len, r_len);
                return {1, true};
            }

            // 左右子树中存在start节点，更新结果，并返回从当前节点到start节点的高度
            if (l_found || r_found) {
                ans = max(ans, l_len + r_len);
                return {(l_found ? l_len: r_len)+1, true};
            }
						
            // 如果左右子树中均不存在start节点，直接返回高度
            return {max(l_len, r_len) + 1, false};
        };

        dfs(dfs, root);
        return ans;
    }
};
```

# 三、回溯

## 56. **二叉树的所有路径**

自顶向下DFS，使用参数path记录从根到叶子的路径，到达叶子时将其加入ans中。

```cpp
class Solution {
public:
    vector<string> binaryTreePaths(TreeNode* root) {
        vector<string> ans;
        auto dfs = [&](auto&& self, TreeNode* node, string path) {
            if (!node) return ;
            if (!node->left && !node->right) {
                path += to_string(node->val);
                ans.push_back(path);
                return ;
            }

            path += to_string(node->val) + "->";
            self(self, node->left, path);
            self(self, node->right, path);
        };

        dfs(dfs, root, "");
        return ans;
    }
};
```

## 57. **路径总和 II**

自顶向下DFS，使用一个vector变量path记录当前路径：

- 若当前节点为空，直接返回；否则将节点值加入和sum，并将节点值加入path。
- 若当前节点为叶子，且路径总和为targetSum，将该路径加入ans中。
- 否则，向下递归左右子树。
- 最后在回溯的时候（即“归”的时候）将当前节点从path中剔除。

```cpp
class Solution {
public:
    vector<vector<int>> pathSum(TreeNode* root, int targetSum) {
        vector<vector<int>> ans;
        vector<int> path;
        
        auto dfs = [&](auto&& self, TreeNode* node, int sum) {
            if (!node) return ;

            // 在递的过程中记录路径到path，记录当前路径和到sum
            path.push_back(node->val);
            sum += node->val;
            if (!node->left && !node->right && sum == targetSum) {
                // 到达叶子，路径和正好为targetSum，记录该path
                ans.push_back(path);
            } else {
                // 否则继续向后递归
                self(self, node->left, sum);
                self(self, node->right, sum);
            }
            
            // 从当前层退出时要回溯path
            path.pop_back();
        };

        dfs(dfs, root, 0);

        return ans;
    }
};
```

## 58. **二叉树中的伪回文路径**

题目给出了一个前提：每个节点的值为 1 到 9 。

因此可以创建一个长度为10的整形数组，记录路径中元素值[1, 9]出现的次数，这可以被优化为对1求异或。

- 如果当前节点为叶子，检查数组之和是否小于2，如果是表示该路径为伪回文路径；否则当前叶子不是回文路径。
- 如果当前节点为分支节点，则递归找到左右子树中的回文路径数

```cpp
class Solution {
public:
    int pseudoPalindromicPaths(TreeNode* root) {
        int p[10]{};
        auto dfs = [&](auto&& self, TreeNode* node) -> int {
            if (node == nullptr) {
                return 0;
            }
            
            // 修改 node->val 出现次数的奇偶性
            p[node->val] ^= 1; 

            int res;
            if (node->left == nullptr && node->right == nullptr) { 
		            // node 是叶子节点
                res = reduce(p, p + 10) <= 1;
            } else {
                res = self(self, node->left) + self(self, node->right);
            }
            
            // 恢复到递归 node 之前的状态（不做这一步就把 node->val 算到其它路径中了）
            p[node->val] ^= 1;
            return res;
        };
        
        return dfs(dfs, root);
    }
};
```

## 59. **路径总和 III**

题目要求找到所有和为targetSum的从上到下的连续路径，如果把树视为一组由根到叶子的路径构成的数组，找这样的连续路径就相当于在数组中找区间和为targetSum的区间数量。

考虑前缀和的思路，区间[l, r]的和为[0, r]的前缀和减去[0, l-1]的前缀和。在“递”的过程中将不同前缀和出现的次数记录在一个哈希表中，对于一个新节点，如果当前前缀和cur，ans += mp[cur - targetSum] 就记录了以当前节点为右端点且和为targetSum的的区间数量。

注意在向下递归完毕后，要将当前前缀合从哈希表中剔除。

```cpp
class Solution {
public:
    int pathSum(TreeNode* root, int targetSum) {
        if (!root) return 0;
        int ans = 0;
        unordered_map<long, int> mp;
        mp[0] = 1;   // 空前缀，处理"从根开始的路径"

        auto dfs = [&](auto&& self, TreeNode* node, long cur) {
            if (!node) return;
            cur += node->val;                    // 当前节点前缀和
            ans += mp[cur - targetSum];          // 统计以 node 结尾的合法路径
            mp[cur]++;                           // 加入当前前缀
            self(self, node->left,  cur);
            self(self, node->right, cur);
            mp[cur]--;                           // 回溯
        };

        dfs(dfs, root, 0);
        return ans;
    }
};
```

## 60. **二叉搜索树的最近公共祖先**

题目给出root为一颗二叉搜索树，因此可以通过root与p、q的大小关系来确定p和q所处的位置。

- 如果p和q的值均小于root，向左递归
- 如果p和q的值均大于root，向右递归
- 否则，当前节点就是p和q的最近公共祖先

```cpp
class Solution {
public:
    TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
        int x = root->val;
        
        if (p->val < x && q->val < x) {  // p和q均在根左侧
            return lowestCommonAncestor(root->left, p, q);
        } 
        if (p->val > x && q->val > x) {  // p和q均在根右侧
            return lowestCommonAncestor(root->right, p, q);
        }
				
				// p和q在根的左右或者就是根本身这两种情况都直接返回根
        return root;
    }
};
```

## 61. **二叉树的最近公共祖先**

相比上一道题，这道题没有了BST有序的特性。

- 当root为空或root值与p或q相同，直接返回root。
- 递归尝试从左子树中找p和q的最近公共祖先。
- 如果在左右子树分别找到了p和q，返回root。
- 否则，返回存在的那一边。

> lowestCommonAncestor返回值是：如果在root中找到p或q就返回节点，没找到就返回nullptr。
> 

```cpp
class Solution {
public:
    TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
        if (!root || p == root || q == root) return root;
				
        TreeNode* left = lowestCommonAncestor(root->left, p, q);
        TreeNode* right = lowestCommonAncestor(root->right, p, q);

        if (left && right) return root;  // 在左右子树分别找到p和q
				
        return left ? left : right ? right : nullptr;
    }
};
```

## 62. **最深叶节点的最近公共祖先**

同50题。

```cpp
class Solution {
public:
    TreeNode* lcaDeepestLeaves(TreeNode* root) {
        int max_depth = -1;
        TreeNode* ans = nullptr;

        auto dfs = [&](auto&& self, TreeNode* node, int depth) -> int {
            // 递的过程中记录最大深度
            if (!node) {
                max_depth = max(max_depth, depth);
                return depth;
            }

            int l = self(self, node->left, depth+1);
            int r = self(self, node->right, depth+1);

            // 归的过程中记录结果
            if (l == max_depth && r == max_depth) ans = node;

            return max(l, r);
        };

        dfs(dfs, root, 0);
        return ans;
    }
};
```

## 63. **从二叉树一个节点到另一个节点每一步的方向**

较难，暂时掠过。

# 四、二叉搜索树

二叉搜索树（BST）的特点是：中序遍历序列有序。

## 64. **二叉搜索树中的搜索**

根据BST的特性，可以快速搜索目标节点，思路类似二分查找。

```cpp
class Solution {
public:
    TreeNode* searchBST(TreeNode* root, int val) {
        if (!root) return nullptr;
        if (root->val == val) return root;
        
        if (val < root->val) return searchBST(root->left, val);
        return searchBST(root->right, val);
    }
};
```

## 65. **二叉搜索树的最小绝对差**

题目要求找：**树中任意两不同节点值之间的最小差值**。

最小差值一定来自于BST中序遍历序列中两个相邻原素之差，所以可以用中序遍历BST，使用一个变量prev记录前驱的值，每次让prev和当前节点的值求差，然后更新结果。

注意：为了避免编译错误，prev的初值要设置为INT_MIN / 2，而不是INT_MIN。

```cpp
class Solution {
public:
    int getMinimumDifference(TreeNode* root) {
        int prev = INT_MIN / 2; // 节点值大于等于0
        int ans = INT_MAX;
        auto dfs = [&](auto&& self, TreeNode* node) {
            if (!node) return ;

            // 中序遍历
            self(self, node->left);
            ans = min(ans, abs(node->val - prev));
            prev = node->val;
            self(self, node->right);
        };

        dfs(dfs, root);
        return ans;
    }
};
```

## 66. **二叉搜索树的范围和**

中序遍历，仅记录值在[low, high]之间的节点，并且当节点值大于high时剪枝，避免无效访问。

```cpp
class Solution {
public:
    int rangeSumBST(TreeNode* root, int low, int high) {
        int ans = 0;
        auto dfs = [&](auto&& self, TreeNode* node) {
            if (!node) return ;

            self(self, node->left);
            if (node->val > high) return ;
            if (low <= node->val && node->val <= high) {
                ans += node->val;
            }
            self(self, node->right);
        };

        dfs(dfs, root);
        return ans;
    }
};
```

## 67. **二叉搜索树中的众数**

**法一：哈希表 + 遍历二叉树**

使用一个哈希表记录树中每个值出现的次数，返回出现次数最多的值。

**法二：中序遍历**

使用一个指针prev记录中序遍历的前驱节点，在对中的处理中：

- 如果prev为nullptr，说明当前节点为第一个节点，cnt置为1

```cpp
class Solution {
public:
    vector<int> findMode(TreeNode* root) {
        vector<int> ans;
        TreeNode* prev = nullptr;
        int max_cnt = 0;
        int cnt = 0;

        auto dfs = [&](auto&& self, TreeNode* node) {
            if (!node) return;
            
            self(self, node->left);
            if (!prev) {  // 根节点
                cnt = 1;
            } else if (prev->val == node->val) { // 重复节点
                cnt++;
            } else {      // 遇到了前后不同的节点
                cnt = 1;
            }

            prev = node;  // 更新前驱节点
            
            if (cnt == max_cnt) {
                ans.push_back(node->val); // 仅出现次数最多的节点
            } else if (cnt > max_cnt) {
                max_cnt = cnt;
                ans.clear();
                ans.push_back(node->val);
            }
            
            self(self, node->right);
        };

        dfs(dfs, root);
        return ans;
    }
};
```

## 68. 二叉搜索树中第 K 小的元素

所谓第 K 小的元素，就是中序遍历中第k个被访问的节点的值。

我们可以在中序遍历过程中记录访问了的节点数，当遇到第k个节点时返回结果。

此外，为了及时停止遍历，还需要使用一个布尔变量found来标识目标节点是否已经找到，如果在左子树中已经找到了目标，那么就不要继续递归搜索右子树。

```cpp
class Solution {
public:
    int kthSmallest(TreeNode* root, int k) {
        int ans;
        bool found = false;

        auto dfs = [&](auto&& self, TreeNode* node) {
            if (!node) return;
            
            self(self, node->left);
            if (found) return ;

            if (--k == 0) {
                ans = node->val;
                found = true;
                return ;
            }

            self(self, node->right);
        };

        dfs(dfs, root);
        return ans;
    }
};
```

## 69. 验证二叉搜索树

中序遍历的思路最符合逻辑：用变量记录中序遍历序列的前驱节点值（初始化为比最小节点值更小的值即可）。然后在中序遍历的过沉重不断判断前驱是否严格小于当前节点即可。

```cpp
class Solution {
    long long prev = LLONG_MIN;
public:
    bool isValidBST(TreeNode* root) {
        if (!root) return true;

        if (!isValidBST(root->left)) return false;

        if (root->val <= prev) return false;
        prev = root->val;

        return isValidBST(root->right);
    }
};
```

## 70. 两棵二叉搜索树中的所有元素

先中序遍历两颗BST，得到两个有序数组；然后合并这两个有序数组，得到结果。

```cpp
class Solution {
public:
    vector<int> getAllElements(TreeNode* root1, TreeNode* root2) {
        // 中序遍历得到两个有序序列
        auto dfs = [&](auto&& self, TreeNode* node, vector<int>& nums) {
            if (!node) return;
            self(self, node->left, nums);
            nums.push_back(node->val);
            self(self, node->right, nums);
        };

        vector<int> nums1, nums2;
        dfs(dfs, root1, nums1);
        dfs(dfs, root2, nums2);

        vector<int> ans;

        // 合并两个有序数组
        auto merge = [&](auto&& self, vector<int>& nums1, vector<int>& nums2) {
            int i = 0, j = 0;
            while (i < nums1.size() && j < nums2.size()) {
                if (nums1[i] < nums2[j]) {
                    ans.push_back(nums1[i]);
                    i++;
                } else {
                    ans.push_back(nums2[j]);
                    j++;
                }
            }

            while (i < nums1.size()) {
                ans.push_back(nums1[i]);
                i++;
            }

            while (j < nums2.size()) {
                ans.push_back(nums2[j]);
                j++;
            }
        };

        merge(merge, nums1, nums2);   
    
        return ans;
    }
};
```

## 71. 恢复二叉搜索树（重点）

**法一：普通中序遍历**

在中序遍历过程中找到互换节点。思路不难：使用a和b记录互换节点，然后使用prev记录中序遍历过程中的前驱节点。

- 如果前驱节点存在，并且前驱的值大于当前节点的值，说明违反了顺序
    - 如果a为nullptr，那么前驱节点就是互换节点之一，用a记录。
    - 如果a不为nullptr，当前节点就是互换节点之一，用b记录。
- 遍历完成后交换a和b的值即可

这里的空间复杂度为O(h)，h为树的高度。

```cpp
class Solution {
public:
    void recoverTree(TreeNode* root) {
        // 获取中序遍历的序列
        vector<int> nums;
        TreeNode* prev = nullptr;
        TreeNode* a = nullptr;
        TreeNode* b = nullptr;

        auto dfs = [&](auto&& self, TreeNode* node) {
            if (!node) return ;
            self(self, node->left);

            if (prev) {
                if (prev->val > node->val) {
                    if (!a) {
                        a = prev; b = node;
                    } else {
                        b = node;
                    }
                }
            }
            
            prev = node;
            self(self, node->right);
        };

        dfs(dfs, root);
        swap(a->val, b->val);
    };
};
```

**法二：Morris遍历**

> Morris遍历可以消除DFS过程中的空间开销，将空间复杂度转换为O(1)。
> 

利用叶子节点右子树指针为空的特点，将其利用起来指向中序遍历的后继节点。

```cpp
class Solution {
public:
    void recoverTree(TreeNode* root) {
        TreeNode* a = nullptr;
        TreeNode* b = nullptr;
        TreeNode* prev = nullptr;

        while (root) {
            if (!root->left) {
                // 左为空，就直接处理中间节点
                if (prev && prev->val > root->val) {
                    if (!a) {
                        a = prev; b = root;
                    } else {
                        b = root;
                    }
                }
                prev = root;
                root = root->right;
            } else {
                TreeNode* t = root->left;
                while (t->right && t->right != root) t = t->right;
                if (t->right == nullptr) {  // 还未建立索引
                    t->right = root;    // 建立索引
                    root = root->left;
                } else {                    // 索引存在
                    t->right = nullptr;
                    if (prev && prev->val > root->val) {
                        if (!a) {
                            a = prev; b = root;
                        } else {
                            b = root;
                        }
                    }
                    prev = root;
                    root = root->right;
                }
            }
        }
        swap(a->val, b->val);
    };
};
```

## 72. **递增顺序搜索树**

引入dummy节点统一操作，在中序遍历的过程中改变节点的左右子树指针，构造递增顺序的搜索树。

```cpp
class Solution {
public:
    TreeNode* increasingBST(TreeNode* root) {
        TreeNode dummy;
        dummy.right = root;
        auto parent = &dummy;

        auto dfs = [&](auto&& self, TreeNode* node) {
            if (!node) return;

            self(self, node->left);
	           
	          // 改变节点的连接
            parent->right = node;
            node->left = nullptr;    // 中序遍历，左侧已经访问了
            parent = node;
            
            self(self, node->right);
        };

        dfs(dfs, root);
        parent->right = nullptr;
        return dummy.right;
    }
};
```

## 73. **二叉搜索树最近节点查询**

这道题考查两个点：BST中序遍历结果有序 和 二分法

- 首先使用中序遍历取得BST上的有序序列nums
- 然后使用二分法在nums中搜索满足条件的元素

注意：

- 经典的lower_bound函数写法不要忘记，用于查找大于等于target的第一个元素
    - 其返回值的下标范围是[0, n]，返回0不代表找到目标，返回n表示一定没找到
- 使用lower_bound的返回值为i，如果 i < n 就得到max的下标，否则记为-1
- 只有lower_bound的返回值在范围[1, n]时才表示找到了min，min的值为nums[i-1]，否则记为-1

```cpp
class Solution {
    int lower_bound(vector<int>& nums, int target) {
        int l = 0, r = nums.size();
        while (l < r) {
            int mid = l + (r - l) / 2;
            if (nums[mid] >= target) {
                r = mid;
            } else {
                l = mid + 1;
            }
        }
        return l;
    }
public:
    vector<vector<int>> closestNodes(TreeNode* root, vector<int>& queries) {
        // 中序遍历得到有序序列
        vector<int> nums;
        auto dfs = [&](auto&& self, TreeNode* node) {
            if (!node) return ;
            self(self, node->left);
            nums.push_back(node->val);
            self(self, node->right);
        };
        dfs(dfs, root); 

        vector<vector<int>> ans;
        int n = nums.size();
        for (int x : queries) {
            int i = lower_bound(nums, x);
            int second = i < n ? nums[i] : -1;
            if (i == n || nums[i] != x) i--;
            int first = i >= 0 ? nums[i] : -1;
            ans.push_back({first, second});
        }
        
        return ans;
    }
};
```

## 74. **两数之和 IV - 输入二叉搜索树**

**法一：中序遍历BST构造有序数组 + 双指针**

```cpp
class Solution {
public:
    bool findTarget(TreeNode* root, int k) {
		    // 遍历BST，得到有序序列
        vector<int> nums;
        auto dfs = [&](auto&& self, TreeNode* node) {
            if (!node) return ;
            self(self, node->left);
            nums.push_back(node->val);
            self(self, node->right);
        };
        dfs(dfs, root);
				
				// 双指针法解两数之和
        int l = 0, r = nums.size() - 1;
        while (l < r) {
            int sum = nums[l] + nums[r];
            if (sum < k) {
                l++;
            } else if (sum > k) {
                r--;
            } else {
                return true;
            }
        }

        return false;
    }
};
```

**法二：哈希表 + 中序遍历**

使用一个哈希表记录中序遍历中遇到过的所有元素值，在后续遍历过程中如果发现哈希表中存在值为 **k - node→val** 的元素，就返回true。

```cpp
class Solution {
public:
    bool findTarget(TreeNode* root, int k) {
        unordered_set<int> s;
        auto dfs = [&](auto&& self, TreeNode* node) -> bool {
            if (!node) return false;
            
            bool ok = self(self, node->left);
            if (ok) return true;

            if (s.contains(k - node->val)) return true;
            s.insert(node->val);

            return self(self, node->right);
        };
        return dfs(dfs, root);
    }
};
```

## 76. **二叉搜索子树的最大键值和（Hard）**

## 77. **合并多棵二叉搜索树（Hard）**

两道hard，暂时不做。