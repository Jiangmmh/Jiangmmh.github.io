---
title: "Leetecode 链表"
date: '2026-10-14T21:14:25+08:00'
draft: false
tags: ["链表"]
categories: [Leetecode]
---
这篇文章记录了链表相关的重点算法题  （共51道），使用C++实现。

题目链接见灵神的题单：[链表题单](https://leetcode.cn/discuss/post/3142882/fen-xiang-gun-ti-dan-lian-biao-er-cha-sh-6srp/)。

# 一、遍历链表

## 1. **二进制链表转整数**

链表元素均为0或1，整个链表表示一个二进制数（最高位在链表头部），将该链表转换为该二进制数的十进制值。

思路：将ans初始化为0，遍历该链表，每遇到一个节点就将ans左移一位并加上当前节点的值。

时间复杂度为：O(n)，n为链表长度

```cpp
class Solution {
public:
    int getDecimalValue(ListNode* head) {
        int ans = 0;
        for (auto cur = head; cur; cur = cur->next) {
            ans = (ans << 1) + cur->val;
        }

        return ans;
    }
};
```

## 2. **找出临界点之间的最小和最大距**

> 
> 
> 
> 临界点就是极值点（严格大于或小于两侧元素）。
> 

我的思路：先遍历链表，找出全部的临界点，再遍历找出的临界点数组，得到最大和最小临界点距离。

- 编写函数findLocalMinMax，找出全部临界点，并返回临界点的下标数组localMinMax
- 最大临界点距离就是localMinMax第一个元素与最后一个元素之差
- 最小临界点距离就是localMinMax中相邻元素之差的最小值

时间复杂度：O(n), n为输入链表的长度

空间复杂度：O(n)

```cpp
class Solution {
    vector<int> findLocalMinMax(ListNode *head) {
        vector<int> ans;
        if (!head || !head->next) return ans;
  
        auto prev = head;
        int idx = 1;
        for (auto cur = head->next; cur->next; cur = cur->next) {
            // 取出前驱和后继的值
            int p = prev->val, q = cur->next->val;
            int x = cur->val;

            if ((p < x && q < x) || (p > x && q > x)) {
                ans.push_back(idx);
            }

            prev = cur;
            idx++;
        }

        return ans;
    }
public:
    vector<int> nodesBetweenCriticalPoints(ListNode* head) {
        // 找到全部的临界点
        vector<int> localMinMax = findLocalMinMax(head);
        int n = localMinMax.size();
        
        // 临界点数量少于两个，直接返回 {-1, -1}
        if (n < 2) return {-1, -1};

        int maxDistance = localMinMax[n-1] - localMinMax[0];
        int minDistance = INT_MAX;
        for (int i = 1; i < n; i++) {
            minDistance = min(minDistance, localMinMax[i] - localMinMax[i-1]);
        }

        return {minDistance, maxDistance};
    }
};
```

优化：可以在遍历链表的过程中，记录第一个临界点的位置和记录前一个临界点的位置，来得到最大和最小临界点距离，将空间复杂度降为O(1)。

## 3. **合并零之间的节点**

简单题，遍历链表，时间复杂度为O(n)。

```cpp
class Solution {
public:
    ListNode* mergeNodes(ListNode* head) {
        ListNode dummy;
        ListNode *newPrev = &dummy;
				
        auto cur = head;
        while (cur) {
            if (cur->val == 0) {
		            // 找到了值为0的节点
                cur = cur->next;
                
                // 如果该0节点为最后一个节点，直接退出循环
                if (cur == nullptr) break;
                
                // 统计两个0之间的元素之和，并创建新节点
                int sum = 0;
                while (cur && cur->val != 0) {
                    sum += cur->val;
                    cur = cur->next;
                }
                auto newNode = new ListNode(sum);
                newPrev->next = newNode;
                newPrev = newNode;
            }
        }

        return dummy.next;
    }
};
```

## 4. **分隔链表**
题目要求将一个链表划分为k部分，其中多余的部分均分到前面几部分中。
```cpp
class Solution {
public:
    vector<ListNode*> splitListToParts(ListNode* head, int k) {
        // 1. 统计链表长度
        int n = 0;
        for (auto cur = head; cur; cur = cur->next) n++;

        // 2. 计算每段长度
        int base = n / k;
        int extra = n % k;

        // 3. 逐段切分
        vector<ListNode*> ans;
        auto first = head;
        for (int i = 0; i < k; i++) {
            ans.push_back(first);  // 记录当前段，空段为nullptr
            
            // 将多余的部分平均分给前extra段
            int len = base + (i < extra ? 1 : 0); 

            // 如果first已经为空，那么后面的for和if均不会进入
            auto last = first;
            for (int j = 0; j < len-1; j++) {
                last = last->next;
            }

            // 将链表断开
            if (last != nullptr) {
                auto nxt = last->next;
                last->next = nullptr;
                first = nxt;
            }
        }

        return ans;
    }
};
```

## 5. **链表组件**

组件的概念：所谓组件，就一个是元素均在nums中出现过的最长连续子链表。

我的思路：

- 使用hash-set记录nums中的元素，快速判断元素知否存在于nums中
- 然后遍历链表，确定条件的左侧，然后向后遍历找到右侧
- 记录满足条件的组件数量

时间复杂度：O(n)，n为链表head的长度

空间复杂度：O(m)，m为nums的长度

```cpp
class Solution {
public:
    int numComponents(ListNode* head, vector<int>& nums) {
        unordered_set<int> st(nums.begin(), nums.end());
        auto left = head;

        int ans = 0;
        while (left) {
            while (left && !st.contains(left->val)) {
                left = left->next;
            }

            if (!left) break;

            auto right = left;
            while (right && st.contains(right->val)) {
                right = right->next;
            }
            ans++;
            left = right;
        }

        return ans;
    }
};
```

# **二、删除节点**

## 6. **移除链表元素**

我的思路：

- 遍历链表，如果发现节点的值为val，就将其从链表中摘除
- **单链表摘除节点必须获得其前驱，因此引入dummy节点统一操作**

时间复杂度：O(n)，n为链表head的长度。

```cpp
class Solution {
public:
    ListNode* removeElements(ListNode* head, int val) {
        ListNode dummy(0, head);
        auto prev = &dummy;
        while (prev->next) {
            auto cur = prev->next;
            if (cur->val == val) {
                prev->next = cur->next;
            } else {
                prev = cur;
            }
        }
        return dummy.next;
    }
};
```

## 7. **从链表中移除在数组中存在的节点**

同上，将删除条件改为节点元素存在于数组nums中。

```cpp
class Solution {
public:
    ListNode* modifiedList(vector<int>& nums, ListNode* head) {
        unordered_set<int> st(nums.begin(), nums.end());
        ListNode dummy(0, head);
        auto prev = &dummy;
        while (prev->next) {
            auto cur = prev->next;
            if (st.contains(cur->val)) {
                prev->next = cur->next;
            } else {
                prev = cur;
            }
        }
        return dummy.next;
    }
};
```

## 8. **删除排序链表中的重复元素**

题目给出了链表已经排序的假设，因此重复元素是连续的，所以我们只需要使用**双指针法**，左指针指向元素第一次出现的位置，右指针向后遍历链表直至其元素与左指针节点元素不同，更新左指针的后继为右指针，然后更新左指针，继续删除剩余的重复节点。

时间复杂度：O(n)，n为链表head的长度。

```cpp
class Solution {
public:
    ListNode* deleteDuplicates(ListNode* head) {
        // 链表已排序，重复元素连续
        if (!head || !head->next) return head;

        auto left = head;
        auto right = head->next;
				
        while (left) {
            while (right && right->val == left->val) {
                right = right->next;
            }
            left->next = right;
            left = right;
        }

        return head;
    }
};
```

## 9. **删除排序链表中的重复元素 II**

上题仅要求删除**多余的**重复元素，而本题则要求将所有存在重复的元素均删除。

思路与上题基本相似，不过需要通过left->next 是否等于 right来判断元素是否重复。

时间复杂度：O(n)，n为链表head的长度

```cpp
class Solution {
public:
    ListNode* deleteDuplicates(ListNode* head) {
        ListNode dummy(0, head);
        auto prev = &dummy;

        while (prev->next) {
            auto left = prev->next;
            auto right = left;
            while (right && right->val == left->val) {
                right = right->next;
            }

            if (left->next != right) {
                // 存在重复
                prev->next = right;
            } else {
                // 不存在重复
                prev = left;
            }
        }

        return dummy.next;
    }
};
```

## 10. **合并两个链表**

这道题目考查链表操作，本质上就是通过遍历找到三个节点，要删除的子链表的两个端点和list2的尾节点。

- 前者直接遍历即可
- 后者可以用快慢指针（连续两个指针）
- 最后修改指针的指向，将链表重新连接即可

```cpp
class Solution {
public:
    ListNode* mergeInBetween(ListNode* list1, int a, int b, ListNode* list2) {
        // 找三个指针，list1中节点a的前驱节点和节点b+1的前驱节点、list2的尾节点
        ListNode *p_l1 = list1, *q_l1 = list1;
        for (int i = 0; i < a-1; i++) p_l1 = p_l1->next;
        for (int j = 0; j < b; j++) q_l1 = q_l1->next;

        ListNode* last_l2 = list2;
        // 快慢指针找尾节点
        for (ListNode* fast = last_l2->next; fast; fast = fast->next) {
            last_l2 = last_l2->next;
        }

        p_l1->next = list2;
        last_l2->next = q_l1->next;
        return list1;
    }
};
```

## 11. **从链表中移除节点**

**法一：暴力法**

遍历链表，对于每个节点，遍历其右侧链表，查看是否存在比它大的节点，如果存在就将当前节点删除。

时间复杂度：O(n^2)，n为链表head的长度

```cpp
class Solution {
public:
    ListNode* removeNodes(ListNode* head) {
        ListNode dummy(0, head);
        auto prev = &dummy;
        while (prev->next) {
            auto cur = prev->next;
            if (!cur->next) break;
						
						// 遍历右侧链表，检查是否存在比当前节点值更大的节点
            auto right = cur->next;
            while (right && cur->val >= right->val) {
                right = right->next;
            }

            if (right != nullptr) {
                prev->next = cur->next;
            } else {
                prev = cur;
            }
        }

        return dummy.next;
    }
};
```

**法二：翻转链表**

<aside>
💡

通过翻转链表，将判断右侧子链表是否存在更大的节点，转换为左侧节点是否存在更大的节点，避免重复遍历右侧链表。

</aside>

先翻转链表，在遍历过程中记录遇到的最大值节点值，如果当前节点的值小于该最大值就将其删除，最后再次翻转该链表，得到结果。

时间复杂度：O(n)，n为链表head的长度。

```cpp
class Solution {
    ListNode* reverse(ListNode* head) {
        auto cur = head;
        head = nullptr;
        while (cur) {
            auto nxt = cur->next;
            cur->next = head;
            head = cur;
            cur = nxt;
        }
        return head;
    }
public:
    ListNode* removeNodes(ListNode* head) {
        head = reverse(head);

        ListNode dummy(0, head);
        int max_val = INT_MIN;
        auto prev = &dummy;
        while (prev->next) {
            auto cur = prev->next;
            if (cur->val < max_val) {
                prev->next = cur->next;
            } else {
                prev = cur;
                max_val = cur->val;
            }
        }
        
        dummy.next = reverse(dummy.next);
        return dummy.next;
    }
};
```

## 12. **删除链表中的节点**

仅传入待删除的节点，并且该节点不是最后一个节点。

```cpp
class Solution {
public:
    void deleteNode(ListNode* node) {
        node->val = node->next->val;
        node->next = node->next->next;
    }
};
```

# **三、插入节点**

## 13. **在链表中插入最大公约数**

主要还是考察链表的遍历和指针操作的细节，每两个节点一组，求gcd并插入一个新节点。

时间复杂度：O(n)，n为链表head的长度。

```cpp
class Solution {
    int gcd(int a, int b) {
        if (a == 0) {
            return b;
        }
        return gcd(b % a, a);
    }
public:
    ListNode* insertGreatestCommonDivisors(ListNode* head) {
        if (!head || !head->next) return head;

        auto p = head, q = head->next;
        while (q != nullptr) {
            int result = gcd(p->val, q->val);
            auto newNode = new ListNode(result);
            p->next = newNode;
            newNode->next = q;

            p = q, 
            q = p->next;
        }

        return head;
    }
};
```

## 14. **对链表进行插入排序**

用一个dummy节点来存储排序后的列表，使用cur来遍历链表head，对于每个元素都从dummy→next开始向后搜索，直至找到第一个比他大的元素或prev→next为空时将cur插入。

时间复杂度：O(n)，n为链表head的长度。

```cpp
class Solution {
public:
    ListNode* insertionSortList(ListNode* head) {
        ListNode dummy;
        auto cur = head;
        auto prev = &dummy;
       
        while (cur) {
            while (prev->next && prev->next->val <= cur->val) {
                prev = prev->next;
            }
            auto nxt = cur->next;
            cur->next = prev->next;
            prev->next = cur;
            prev = &dummy;
            cur = nxt;
        }

        return dummy.next;
    }
};
```

## 15. **循环有序列表的插入**

链表head为非降序，使用双指针指向两个连续的节点，遍历链表，搜索插入点。

```cpp
class Solution {
public:
    Node* insert(Node* head, int insertVal) {
        auto node = new Node(insertVal);

        // head为空链表
        if (!head) {
            node->next = node;
            return node;
        }

        // 搜索插入位置
        auto cur = head, nxt = head->next;
        while (nxt != head) {
            if (cur->val <= insertVal && insertVal <= nxt->val) {
                // insertVal在两个节点值之间，可插入
                break;
            }
            if (cur->val > nxt->val) {
                // insertVal可以放在末尾或首部
                if (insertVal > cur->val || insertVal < nxt->val) {
                    break;
                }
            }
            cur = cur->next;
            nxt = nxt->next;
        }
        cur->next = node;
        node->next = nxt;
        return head;
    }
};
```

# **四、反转链表**

## 16. **反转链表**

```cpp
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        auto cur = head;
        head = nullptr;

        while (cur) {
            auto nxt = cur->next;
            cur->next = head;
            head = cur;
            cur = nxt;
        }

        return head;
    }
};
```

## 17. **反转链表 II**

先找**左端点的前驱**和**右端点**，断开链接，通过reverse反转该子链表，最后重新建立链接。

```cpp
class Solution {
    ListNode* reverse(ListNode* head) {
        auto cur = head;
        head = nullptr;

        while (cur) {
            auto nxt = cur->next;
            cur->next = head;
            head = cur;
            cur = nxt;
        }

        return head;
    }
public:
    ListNode* reverseBetween(ListNode* head, int left, int right) {
        ListNode dummy(0, head);
        auto l_prev = &dummy, r = &dummy;

        // 找到第left-1个节点 和 第right个节点
        for (int i = 0; i < left-1; i++) l_prev = l_prev->next;
        for (int i = 0; i < right; i++) r = r->next;
        
        // 断开连接，取出待反转的链表
        auto rest = r->next;
        r->next = nullptr;
        
        // 记录反转前的首节点，在反转后变成尾节点
        auto first = l_prev->next;
        l_prev->next = reverse(first);

        // 重新连接
        first->next = rest;
        
        return dummy.next;
    }
};
```

## 18. **两两交换链表中的节点**

双指针法交换链表节点。

```cpp
class Solution {
public:
    ListNode* swapPairs(ListNode* head) {
        if (!head || !head->next) {
            return head;
        }

        ListNode dummy(0, head);
        auto prev = &dummy;
        while (prev->next) {
            auto p = prev->next;
            if (!p->next) break;
            auto q = p->next;

            p->next = q->next;
            prev->next = q;
            q->next = p;
            prev = p;
        }

        return dummy.next;
    }
};
```

## 19. **K 个一组翻转链表**

使用dummy作为prev，统一操作。只有当剩余子链表节点个数≥k时才进行反转。

```cpp
class Solution {
public:
    ListNode* reverseKGroup(ListNode* head, int k) {
        int n = 0;
        for (auto cur = head; cur; cur = cur->next) n++;

        ListNode dummy(0, head);
        auto prev = &dummy;
        
        for (; n >= k; n -= k) {
            auto cur = prev->next;
            // 记录反转前的首节点，反转后变成尾节点
            auto last = cur;
            for (int i = 0; i < k; i++) {
                auto nxt = cur->next;
                cur->next = prev->next;
                prev->next = cur;
                cur = nxt;
            }
            prev = last;
            last->next = cur;
        }

        return dummy.next;
    }
};
```

## 20. **反转偶数长度组的节点**

这道题目和上题类似，不过上题是固定反转长度为k的子链表，而本题则要求反转长度递增（1, 2, 3,…），且仅在长度为偶数时进行反转。有一点需要特别注意：**最后一组子链表的数量可能不及一组的长度，此时应当使用剩余元素数量来判断奇偶性。**

```cpp
class Solution {
public:
    ListNode* reverseEvenLengthGroups(ListNode* head) {
        int n = 0;
        for (auto cur = head; cur; cur = cur->next) n++;

        ListNode dummy(0, head);
        auto prev = &dummy;
        int group_len = 1;
        for (; n > 0; n -= group_len, group_len++) {
            int actual_len = min(n, group_len);
            if (actual_len % 2 == 1) {
		            // 奇数组
                for (int i = 0; i < actual_len; i++) prev = prev->next;
            } else {
		            // 偶数组
                auto cur = prev->next;
                auto last = cur;
                for (int i = 0; i < actual_len; i++) {
                    auto nxt = cur->next;
                    cur->next = prev->next;
                    prev->next = cur;
                    cur = nxt;
                }
                prev = last;
                prev->next = cur;
            }
        }
        return dummy.next;
    }
};
```

## 五、**前后指针**

## 21. **删除链表的倒数第 N 个结点**

使用双指针实现，初始时让两个指针之间存在n个节点，然后双指针同时向后遍历，直至右指针到达末尾，左指针正好指向待删除节点的前驱。

```cpp
class Solution {
public:
    ListNode* removeNthFromEnd(ListNode* head, int n) {
        ListNode dummy(0, head);
        auto prev = &dummy;
        auto left = prev;
        auto right = head;
        while (n--) right = right->next;
        
        while (right) {
            left = left->next;
            right = right->next;
        }
        left->next = left->next->next;
        return dummy.next;
    }
};
```

## 22. **交换链表中的节点**

考察如何在链表中找到第k个节点和倒数第k个节点。此外，交换节点可以转换为交换节点的值。

```cpp
class Solution {
public:
    ListNode* swapNodes(ListNode* head, int k) {
        auto slow = head;
        auto fast = head;
        
        // 遍历k-1次找到目标节点
        for (int i = 0; i < k-1; i++) fast = fast->next;
        auto first = fast;
				
				// 前后指针找倒数第k个节点
        while (fast->next) {
            slow = slow->next;
            fast = fast->next;
        }

        auto second = slow;
        swap(first->val, second->val);

        return head;
    }
};
```

# 五、**快慢指针**

## 23. **链表的中间结点**

```cpp
class Solution {
public:
    ListNode* middleNode(ListNode* head) {
        auto slow = head, fast = head;
        while (fast && fast->next) {
            fast = fast->next->next;
            slow = slow->next;
        }
        return slow;
    }
};
```

## 24. 删除链表的中间节点

思路同上，不过要找的是中间节点的前驱节点，可以通过引入dummy节点实现。

```cpp
class Solution {
public:
    ListNode* deleteMiddle(ListNode* head) {
        ListNode dummy(0, head);
        auto slow = &dummy;
        auto fast = head;
        while (fast && fast->next) {
            fast = fast->next->next;
            slow = slow->next;
        }

        slow->next = slow->next->next;
        return dummy.next;
    }
};
```

## 25. 回文链表

首先要了解我们求中间节点的方法得到的是：

- 数组长度为偶数，中间偏右的节点
- 数组长度为奇数，正好是中间节点

因此当数组长度为偶数时，应当直接反转中间节点为首节点的链表。

而当数组长度为奇数时，应当反转以中间节点的后继节点为首节点的链表。

但是实际上这两种情况都能统一到直接反转中间节点，因为当数组长度为奇数时，左侧链表的末尾节点也指向了中间节点，因此直接反转中间节点不影响回文的判断。

```cpp
class Solution {
		// 链表反转
    ListNode* reverse(ListNode* head) {
        auto cur = head;
        head = nullptr;
        while (cur) {
            auto nxt = cur->next;
            cur->next = head;
            head = cur;
            cur = nxt;
        }
        return head;
    }
		
		// 求中间节点
    ListNode* middleNode(ListNode* head) {
        auto slow = head, fast = head;
        while (fast && fast->next) {
            fast = fast->next->next;
            slow = slow->next;
        }
        return slow;
    }
public:
    bool isPalindrome(ListNode* head) {
        auto mid = middleNode(head);
        auto l2 = reverse(mid);
        auto l1 = head;
        
        while (l2) {
            if (l1->val != l2->val) return false;
            l1 = l1->next;
            l2 = l2->next;
        }

        return true;
    }
};
```

## 26. 链表最大孪生和

**法一：辅助数组+双指针**

单链表不方便从两端同时向内遍历，可以先遍历链表将其中的元素取出存放到一个辅助数组中

然后用双指针从两端开始不断求孪生和。

```cpp
class Solution {
public:
    int pairSum(ListNode* head) {
        vector<int> nums;
        for (auto cur = head; cur; cur = cur->next) {
            nums.push_back(cur->val);
        }

        int ans = 0;
        int l = 0, r = nums.size() - 1;
        while (l < r) {
            ans = max(ans, nums[l] + nums[r]);
            ++l;
            --r;
        }

        return ans;
    }
};
```

**法二：找中间节点并反转**

```cpp
class Solution {
    ListNode* reverse(ListNode* head) {
        auto cur = head;
        head = nullptr;
        while (cur) {
            auto nxt = cur->next;
            cur->next = head;
            head = cur;
            cur = nxt;
        }
        return head;
    }

    ListNode* middleNode(ListNode* head) {
        auto slow = head, fast = head;
        while (fast && fast->next) {
            slow = slow->next;
            fast = fast->next->next;
        }
        return slow;
    }
public:
    int pairSum(ListNode* head) {
        auto l = head;
        auto r = middleNode(head);
        r = reverse(r);

        int ans = 0;
        while (r) {
            ans = max(ans, l->val + r->val);
            l = l->next;
            r = r->next;
        }

        return ans;
    }
};
```

## 27. **重排链表**

和前面的题目思路相似，先找中点，然后反转的到后半部分，最后合并即可。

但是其中需要特别注意，**找中点时需要找中点的前驱**，彻底将前后链表断开，否则后续合并前后两半部分链表时会出问题。

```cpp
class Solution {
    ListNode* reverse(ListNode* head) {
        auto cur = head;
        head = nullptr;
        while (cur) {
            auto nxt = cur->next;
            cur->next = head;
            head = cur;
            cur = nxt;
        }
        return head;
    }
		
		// 返回中点的前驱
    ListNode* middleNode(ListNode* head) {
        ListNode dummy(0, head);
        auto slow = &dummy;
        auto fast = head;
        while (fast && fast->next) {
            slow = slow->next;
            fast = fast->next->next;
        }
        return slow;
    }
public:
    void reorderList(ListNode* head) {
        if (!head || !head->next) return;
			
        ListNode dummy(0);
        auto prev = &dummy;
				
        auto l = head;

        auto mid = middleNode(head);
        auto r = reverse(mid->next);
        
        // 链表从中断开
        mid->next = nullptr;

        while (l || r) {
            if (l) {
                prev->next = l; l = l->next; prev = prev->next;
            }

            if (r) {
                prev->next = r; r = r->next; prev = prev->next;
            }
        }

        prev->next = nullptr;
    }
};
```

## 28. **环形链表**

快慢指针fast和slow，每次分别前进两步和前进一步，如果两者能够相遇，说明链表存在环，否则不存在环。

```cpp
class Solution {
public:
    bool hasCycle(ListNode *head) {
        auto slow = head, fast = head;
        while (fast && fast->next) {
            slow = slow->next;
            fast = fast->next->next;
            if (slow == fast) return true;
        }
        return false;
    }
};
```

## 29. **环形链表 II**

要求找到环的入口。这题是固定的套路，不用管，背下来就行。

```cpp
class Solution {
public:
    ListNode *detectCycle(ListNode *head) {
        auto slow = head, fast = head;
        while (fast && fast->next) {
            slow = slow->next;
            fast = fast->next->next;

            if (slow == fast) {
                slow = head;
                while (slow != fast) {
                    slow = slow->next;
                    fast = fast->next;
                }
                return slow;
            }
        }

        return nullptr;
    }
};
```

## 30. **环形数组是否存在循环**

给你一个数组 `nums`，每个位置 `i` 有一个值 `nums[i]`，表示从 `i` 出发要跳到哪个下标：

- `nums[i] > 0`：向前跳 `nums[i]` 步（下标增大方向）
- `nums[i] < 0`：向后跳 `abs(nums[i])` 步（下标减小方向）

题目问的是：**是否存在一个「循环」**。循环的定义有三个条件：

1. **能一直跳下去并回到某个已访问过的下标**，形成环
2. **环上所有 `nums` 必须同号**（全正或全负），不能正负混着跳
3. **环长 k > 1**，也就是不能自己跳回自己（自环不算）

我的解题思路：

- **外层**：枚举每个起点 `i`，看从它出发能不能找到一个合法环。
- **内层**：从 `i` 出发，用龟兔赛跑判环，同时检查方向一致和自环。
- **剪枝**：但光这样最坏是 O(n²)，需要把已经确认「无环」的路径标记掉，下次不再走。

```cpp
class Solution {
    int nextIndex(vector<int>& nums, int i) {
        int n = nums.size();
        return ((i + nums[i]) % n + n) % n;
    }

    bool check(vector<int>& nums, int start) {
        int slow = start, fast = start;
        int dir = nums[start] > 0 ? 1 : -1;   // 起点方向，环上必须一致

        while (true) {
            // 慢指针走一步
            slow = nextIndex(nums, slow);
            if ((nums[slow] > 0 ? 1 : -1) != dir) return false;  // 方向不一致
            if (slow == nextIndex(nums, slow)) return false;      // 自环，k=1

            // 快指针走两步
            fast = nextIndex(nums, fast);
            if ((nums[fast] > 0 ? 1 : -1) != dir) return false;
            fast = nextIndex(nums, fast);
            if ((nums[fast] > 0 ? 1 : -1) != dir) return false;

            if (slow == fast) return true;   // 相遇，存在合法环
        }
    }
public:
    bool circularArrayLoop(vector<int>& nums) {
        int n = nums.size();
        vector<int> visited(n, 0);

        for (int i = 0; i < n; i++) {
            // 剪枝，跳过已经确定无环的下标
            if (visited[i]) continue;
            if (check(nums, i)) return true;

            // 遍历走过的路径，标记将路径上的节点，避免重复访问
            int cur = i;
            int dir = nums[cur] > 0 ? 1 : -1;
            while (!visited[cur] && (nums[cur] > 0 ? 1 : -1) == dir) {
                visited[cur] = 1;
                cur = nextIndex(nums, cur);
            }
        }
        return false;
    }
};
```

## 31. **寻找重复数**

这道题就是环形链表的数组版本。

```cpp
class Solution {
public:
    int findDuplicate(vector<int>& nums) {
        // 根据鸽笼原理，n+1个取值为[1,n]的元素必存在重复元素

        int slow = 0, fast = 0;
        while (true) {
            slow = nums[slow];   // 等价于slow = slow.next
            fast = nums[nums[fast]]; // 等价于fast = fast.next.next;
            if (fast == slow) break;
        }

        int head = 0;
        while (slow != head) {
            slow = nums[slow];
            head = nums[head];
        }

        return slow;
    }
};
```

# 六、双指针

## **32. 奇偶链表**

```cpp
class Solution {
public:
    ListNode* oddEvenList(ListNode* head) {
        ListNode dummy_even;
        ListNode dummy_odd;
        auto prev_even = &dummy_even;
        auto prev_odd = &dummy_odd;

        auto cur = head;
        while (cur) {
            prev_odd->next = cur;
            prev_odd = cur;
            cur = cur->next;
            if (cur) {
                prev_even->next = cur;
                prev_even = cur;
                cur = cur->next;
            }
        }
        prev_even->next = nullptr;
        prev_odd->next = dummy_even.next;
        return dummy_odd.next;
    }
};
```

## 33. **分隔链表**

思路同上，还是双指针收集两类节点，然后重新连接，唯一的区别是分类条件不同。

```cpp
class Solution {
public:
    ListNode* partition(ListNode* head, int x) {
        ListNode dummy_less, dummy_ge;
        auto prev_less = &dummy_less;
        auto prev_ge = &dummy_ge;

        auto cur = head;
        while (cur) {
            if (cur->val < x) {
                prev_less->next = cur;
                prev_less = cur;
            } else {
                prev_ge->next = cur;
                prev_ge = cur;
            }
            cur = cur->next;
        }

        prev_ge->next = nullptr;
        prev_less->next = dummy_ge.next;
        return dummy_less.next;
    }
};
```

## 34. **相交链表**

![](/images/posts/leetecode-ll/image1.png)

```cpp
class Solution {
public:
    ListNode *getIntersectionNode(ListNode *headA, ListNode *headB) {
        auto pa = headA, pb = headB;
        while (pa != pb) {
            pa = pa ? pa->next : headB;
            pb = pb ? pb->next : headA;
        }
        return pa;
    }
};
```

# 七、**合并链表**

## 35. **两数相加**

使用一个变量carry保存进位，同时作为和；创建dummy节点用于存储和链表。

```cpp
class Solution {
public:
    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
        ListNode dummy;
        auto prev = &dummy;

        int carry = 0;
        while (l1 || l2 || carry) {
            if (l1) {
                carry += l1->val;
                l1 = l1->next;
            }
            if (l2) {
                carry += l2->val;
                l2 = l2->next;
            }
            prev->next = new ListNode(carry % 10);
            prev = prev->next;
            carry /= 10;
        }

        return dummy.next;
    }
};
```

## 36. **两数相加 II**

上一题给出的是两个头节点为最低位的链表，且返回的链表也是该顺序。

这里需要先反转，然后用上题的思路求和，最后对结果反转。

```cpp
class Solution {
    ListNode* reverse(ListNode* head) {
        auto cur = head;
        head = nullptr;
        while (cur) {
            auto nxt = cur->next;
            cur->next = head;
            head = cur;
            cur = nxt;
        }
        return head;
    }

    ListNode* addList(ListNode* l1, ListNode* l2) {
        ListNode dummy;
        auto prev = &dummy;

        int carry = 0;
        while (l1 || l2 || carry) {
            if (l1) {
                carry += l1->val;
                l1 = l1->next;
            }
            if (l2) {
                carry += l2->val;
                l2 = l2->next;
            }
            prev->next = new ListNode(carry % 10);
            prev = prev->next;
            carry /= 10;
        }

        return dummy.next;
    }
public:
    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
        l1 = reverse(l1);
        l2 = reverse(l2);
        ListNode* ans = addList(l1, l2);
        return reverse(ans);
    }
};
```

## 37. **翻倍以链表形式表示的数字**

给出一个链表表示的十进制值（高位在首节点），求翻倍后的链表表示。

思路：先反转，然后从低位开始不断翻倍，最后再反转的到结果链表。

```cpp
class Solution {
    ListNode* reverse(ListNode* head) {
        auto cur = head;
        head = nullptr;
        while (cur) {
            auto nxt = cur->next;
            cur->next = head;
            head = cur;
            cur = nxt;
        }
        return head;
    }
public:
    ListNode* doubleIt(ListNode* head) {
        head = reverse(head);

        ListNode dummy(0, head);
        auto prev = &dummy;

        int carry = 0;
        while (prev->next) {
            auto cur = prev->next;
            carry += 2 * cur->val;  // 和 = 2倍节点值 + 进位
            cur->val = carry % 10;
            carry /= 10;
            prev = prev->next;
        }

        if (carry != 0) {
            prev->next = new ListNode(carry);
        }
        return reverse(dummy.next);
    }
};
```

## 38. **合并两个有序链表**

简单题，无需多言。

```cpp
class Solution {
public:
    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
        ListNode dummy;
        auto prev = &dummy;

        while (list1 && list2) {
            if (list1->val < list2->val) {
                prev->next = list1;
                list1 = list1->next;
            } else {
                prev->next = list2;
                list2 = list2->next;
            }
            prev = prev->next;
        }

        if (list1) {
            prev->next = list1;
        }
        if (list2) {
            prev->next = list2;
        }

        return dummy.next;
    }
};
```

# 八、**分治**

## 39. **合并 K 个升序链表**

利用分治的思想，将K个升序链表不断一分为二，转换为两个升序链表的合并。

```cpp
class Solution {
public:
    ListNode* mergeKLists(vector<ListNode*>& lists) {
        return mergeKLists(lists, 0, lists.size()-1);
    }

    ListNode* mergeKLists(vector<ListNode*>& lists, int l, int r) {
        if (l > r) return nullptr;
        if (l == r) return lists[l];
        
        int mid = l + (r - l) / 2;
        auto left = mergeKLists(lists, l, mid);
        auto right = mergeKLists(lists, mid+1, r);

        // 合并两个有序链表
        ListNode dummy{};   
        auto prev = &dummy;
        while (left && right) {
            if (left->val < right->val) {
                prev->next = left;
                left = left->next;
            } else {
                prev->next = right;
                right = right->next;
            }
            prev = prev->next;
        }

        prev->next = left ? left : right;

        return dummy.next;
    }
};
```

## 40. **排序链表**

分治法，归并排序的思路如下：

- 快慢指针找到中点（其实是中点的前驱）
- 然后将链表切分，递归排序左右两部分链表
- 然后对有序链表进行合并

```cpp
class Solution {
    ListNode* findMid(ListNode* head) {
        ListNode dummy(0, head);
        auto slow = &dummy;
        auto fast = head;
        while (fast && fast->next) {
            slow = slow->next;
            fast = fast->next->next;
        }
        return slow;
    }

    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
        ListNode dummy;
        auto prev = &dummy;
        
        while (list1 && list2) {
            if (list1->val < list2->val) {
                prev->next = list1;
                list1 = list1->next;
            } else {
                prev->next = list2;
                list2 = list2->next;
            }
            prev = prev->next;
        }

        prev->next = list1 ? list1 : list2;
        return dummy.next;
    }

    
public:
    ListNode* sortList(ListNode* head) {
        if (!head || !head->next) {
            return head;
        }

        // 快慢指针找中点，注意这里的fast应该从第二个节点开始
        auto mid = findMid(head);

        // 切分链表
        auto rest = mid->next;
        mid->next = nullptr;

        // 递归对左右两部分链表分别进行排序
        auto left = sortList(head);
        auto right = sortList(rest);
        
        // 合并两个有序链表
        return mergeTwoLists(left, right);
    }
};
```

# 九、**综合应用**

## 41. **链表中的下一个更大节点**

**法一：暴力法**

遍历链表，对于每个节点，向后搜索下一个更大的节点，如果不存在就存储0，否则存储更大节点的值。

时间复杂度：O(n^2)，空间复杂度：O(1)

```cpp
class Solution {
public:
    vector<int> nextLargerNodes(ListNode* head) {
        // BF
        vector<int> ans;
        auto cur = head;
        while (cur) {
            int x = cur->val;
            auto r = cur->next;
            while (r && x >= r->val) {
                r = r->next;
            }

            ans.push_back(r ? r->val : 0);
            cur = cur->next;
        }
        
        return ans;
    }
};
```

**法二：单调栈**

在暴力法中我们反复遍历了链表的后续节点，浪费时间。

因此可以先反转链表，然后遍历它，使用一个单调栈记录最近出现的大于当前元素的值。

思路：

- 对于每个节点的值x，不断弹出栈顶直至栈为空或栈顶元素 > x
- 如果此时单调栈为空，说明前面不存在大于x的元素，在ans中存入0
- 否则，存入第一个大于该元素的值

时间复杂度：O(n)，空间复杂度：O(n)

```cpp
class Solution {
    ListNode* reverseList(ListNode* head) {
        auto cur = head;
        head = nullptr;
        while (cur) {
            auto nxt = cur->next;
            cur->next = head;
            head = cur;
            cur = nxt;
        }
        return head;
    }
public:
    vector<int> nextLargerNodes(ListNode* head) {
        // 单调栈
        stack<int> st;
        vector<int> ans;
        head = reverseList(head);
        
        for (auto cur = head; cur; cur = cur->next) {
            int x = cur->val;
            while (!st.empty() && x >= st.top()) {
                st.pop();
            }
            ans.push_back(st.empty() ? 0 : st.top());
            st.push(x);
        }

        reverse(ans.begin(), ans.end());
        return ans;
    }
};
```

## 42. **从链表中删去总和值为零的连续节点（巧妙）**

第一次遍历链表，使用一个哈希表记录<前缀和，当前节点>对；

第二次遍历链表，让当**前节点**的后继指针指向**最后一次出现相同前缀和的节点**的后继：

- 如果当前节点**left**和哈希表中记录的节点**right**相同，该操作不影响原链表
- 而如果不同，则表示链表区间[left, right]之间全部元素之和为0，应当被删除

```cpp
class Solution {
public:
    ListNode* removeZeroSumSublists(ListNode* head) {
        ListNode dummy(0, head);
        
        unordered_map<int, ListNode*> seen;
        int sum = 0;
        for (auto cur = &dummy; cur; cur = cur->next) {
            sum += cur->val;
            seen[sum] = cur;
        }

        sum = 0;
        for (auto cur = &dummy; cur; cur = cur->next) {
            sum += cur->val;
            cur->next = seen[sum]->next;
        }
        
        return dummy.next;
    }
};
```

## 43. **设计链表**

采用带dummy节点的单链表实现。

```cpp
class MyLinkedList {
private:
    struct Node {
        int val_;
        Node *next_;
        Node(int val=0, Node* next=nullptr): val_(val), next_(next){}
    };

    int sz_;
    Node* head;
    Node* tail;
public:
    MyLinkedList(): sz_(0), head(new Node()) {
        tail = head;
    }
    
    int get(int index) {
        if (index < 0 || index >= sz_) return -1;
        Node *p = head;
        while (index--) {
            p = p->next_;
        }

        return p->next_->val_;
    }
    
    void addAtHead(int val) {
        Node *newNode = new Node(val);
        newNode->next_ = head->next_;
        head->next_ = newNode;

        if (tail == head) {
            tail = newNode;
        }

        ++sz_;
    }
    
    void addAtTail(int val) {
        Node *newNode = new Node(val);
        newNode->next_ = tail->next_;
        tail->next_ = newNode;
        tail = newNode;
        ++sz_;
    }
    
    void addAtIndex(int index, int val) {
        if (index < 0 || index > sz_) return ;
        Node *p = head;
        while(index--) {
            p = p->next_;
        }

        Node *newNode = new Node(val);
        newNode->next_ = p->next_;
        p->next_ = newNode;

        if (tail == p) {
            tail = newNode;
        }
        ++sz_;
    }
    
    void deleteAtIndex(int index) {
        if (index < 0 || index >= sz_) return ;
        Node *p = head;
        while(index--) {
            p = p->next_;
        }

        Node *q = p->next_;
        p->next_ = q->next_;
        
        if (tail == q) {
            tail = p;
        }
        delete q;

        --sz_;
    }
};
```

## 44. **LRU 缓存**

双向链表实现：

- 哈希表加速根据key查找node的速度（缓存是否命中），时间复杂度为O(1)
- 双向链表维护最近使用的关系，头部为最近使用的节点，尾部为最久未使用的节点
- 如果当前节点数等于cap后还要继续加入缓存，则淘汰尾部的节点

```cpp
class LRUCache {
    // 节点的定义：支持双向链接
    struct Node {
        int key_;
        int val_;
        Node *next_, *prev_;
    };

    // map：根据key快速获取节点
    unordered_map<int, Node*> lru_map;
    Node dummy;
    int cap_;

public:
    LRUCache(int capacity): cap_(capacity) {
        // 带dummy节点的双向循环链表
        dummy.next_ = &dummy;
        dummy.prev_ = &dummy;
    }
    
    int get(int key) {
        auto it = lru_map.find(key);
        int ans = -1;
        if (it != lru_map.end()) {
            // 缓存命中
            auto node = it->second;
            ans = node->val_;
            
            // 取出节点
            node->prev_->next_ = node->next_;
            node->next_->prev_ = node->prev_;
            
            // 头插
            node->next_ = dummy.next_;
            node->prev_ = &dummy;
            dummy.next_->prev_ = node;
            dummy.next_ = node;
        }
				
        return ans;
    }
    
    void put(int key, int value) {
        auto it = lru_map.find(key);
        Node* node = nullptr;
        if (it != lru_map.end()) {
            // 找到key，更新内容
            node = it->second;
            node->val_ = value;

            // 取出节点
            node->prev_->next_ = node->next_;
            node->next_->prev_ = node->prev_;
        } else {
            if ((int)lru_map.size() == cap_) {
                // 淘汰最久未使用的尾部节点
                auto last = dummy.prev_;
                last->prev_->next_ = last->next_;
                last->next_->prev_ = last->prev_;
                lru_map.erase(last->key_);   // 同步从 map 移除
                delete last;
            }
            
            node = new Node;
            node->key_ = key;                // 记录 key
            node->val_ = value;
            lru_map[key] = node;             // 登记到 map
        }
				
        // 头插到链表
        node->next_ = dummy.next_;
        node->prev_ = &dummy;
        dummy.next_->prev_ = node;
        dummy.next_ = node;
    }
};
```

## 45. **LFU 缓存**

**简单理解LFU：LRU的本质 = 频数分层 + 每层内部 LRU**

- 统计每个节点在缓存中被访问的频数，初始为1
- 每次访问都将在缓存中的节点频数+1
- 淘汰策略：
    - **频率维度**：淘汰频数最小的
    - **时间维度**：频数相同时，淘汰最久未使用的（LRU）

数据结构的设计：

- 节点的定义，包括双向链表的前驱指针和后继指针、key和value
- 两个哈希表，一个用于根据key找对应节点，另一个用于根据频数找对应LRU链表的dummy节点

具体代码实现如下：

```cpp
struct Node {
    int key;
    int value;
    int freq = 1; // 新书只读了一次
    Node* prev;
    Node* next;

    Node(int k = 0, int v = 0) : key(k), value(v) {}
};

class LFUCache {
private:
    int cap_;
    int min_freq_;
    unordered_map<int, Node*> key2node;
    unordered_map<int, Node*> freq2dummy;

    Node* get_node(int key) {
        auto it = key2node.find(key);
        if (it == key2node.end()) {
            return nullptr;
        }
				
        Node* node = it->second;
        remove(node);
        Node* dummy = freq2dummy[node->freq];
        if (dummy->prev == dummy) {
            freq2dummy.erase(node->freq);
            delete dummy;
            if (min_freq_ == node->freq) {
                min_freq_++;
            }
        }
        node->freq++;
        push_front(node->freq, node);
        return node;
    }

    Node* new_list() {
        Node* dummy = new Node();
        dummy->prev = dummy;
        dummy->next = dummy;
        return dummy;
    }

    void push_front(int freq, Node* x) {
        auto it = freq2dummy.find(freq);
        if (it == freq2dummy.end()) {
            // emplace 返回一个 pair<iterator, bool>：
            //  .first：指向插入元素的迭代器
            //  .second：bool，表示是否插入成功（true = 新插入）
            it = freq2dummy.emplace(freq, new_list()).first;
        }
        Node* dummy = it->second;
        x->prev = dummy;
        x->next = dummy->next;
        dummy->next = x;
        x->next->prev = x;
    }

    void remove(Node* x) {
        x->prev->next = x->next;
        x->next->prev = x->prev;
    }
public:
    LFUCache(int capacity): cap_(capacity) {}
    
    int get(int key) {
        Node* node = get_node(key);
        return node ? node->value : -1;
    }
    
    void put(int key, int value) {
        Node* node = get_node(key);
        if (node) { // 有这本书
            node->value = value; // 更新 value
            return;
        }
        if (key2node.size() == cap_) { // 书太多了
            Node* dummy = freq2dummy[min_freq_];
            Node* back_node = dummy->prev; // 最左边那摞书的最下面的书
            key2node.erase(back_node->key);
            remove(back_node); // 移除
            delete back_node; // 释放内存
            if (dummy->prev == dummy) { // 这摞书是空的
                freq2dummy.erase(min_freq_); // 移除空链表
                delete dummy; // 释放内存
            }
        }
        key2node[key] = node = new Node(key, value); // 新书
        push_front(1, node); // 放在「看过 1 次」的最上面
        min_freq_ = 1;
    }
};
```

## 46. **全 O(1) 的数据结构（未彻底理解）**

```cpp
class AllOne {
    list<pair<size_t, unordered_set<string>>> lst;
    unordered_map<string, decltype(lst)::iterator> mp;

public:
    AllOne() {}

    void inc(string key) {
        if (auto it{mp.find(key)}; it != mp.cend()) {
            auto cur{it->second};
            cur->second.erase(key);
            if (auto nxt{next(cur)};
                nxt == lst.cend() || nxt->first > cur->first + 1) {
                mp[key] = lst.emplace(nxt, cur->first + 1, unordered_set{key});
            } else {
                nxt->second.emplace(key);
                mp[key] = nxt;
            }
            if (cur->second.empty()) {
                lst.erase(cur);
            }
        } else {
            if (lst.empty() || lst.cbegin()->first > 1) {
                mp.emplace(key,
                           lst.emplace(lst.begin(), 1, unordered_set{key}));
            } else {
                lst.begin()->second.emplace(key);
                mp.emplace(key, lst.begin());
            }
        }
    }

    void dec(string key) {
        if (auto it{mp.find(key)}; it != mp.cend()) {
            auto cur{it->second};
            cur->second.erase(key);
            if (cur->first == 1) {
                mp.erase(key);
            } else if (auto pre{make_reverse_iterator(cur)};
                       pre == lst.rend() || pre->first < cur->first - 1) {
                mp[key] = lst.emplace(cur, cur->first - 1, unordered_set{key});
            } else {
                pre->second.emplace(key);
                mp[key] = prev(cur);
            }
            if (cur->second.empty()) {
                lst.erase(cur);
            }
        }
    }

    string getMaxKey() {
        return lst.empty() ? "" : *lst.crbegin()->second.cbegin();
    }

    string getMinKey() {
        return lst.empty() ? "" : *lst.cbegin()->second.cbegin();
    }
};
```

## 47. **设计跳表**

表这种数据结构是由 William Pugh 发明的，关于跳表的详细介绍可以参考论文:「Skip Lists: A Probabilistic Alternative to Balanced Trees」，论文中详细阐述了关于 skiplist 查找元素、删除元素、插入元素的算法伪代码，以及时间复杂度的分析。**跳表是一种随机化的数据结构**，可以被看做二叉树的一个变种，**它在性能上和红黑树、AVL 树不相上下**，**但是跳表的原理非常简单，目前在 Redis 和 LevelDB 中都有用到**。

跳表的期望空间复杂度为 O(n)，**跳表的查询，插入和删除操作的期望时间复杂度均为 O(logn)**。

跳表实际为一种多层的有序链表，跳表的每一层都为一个有序链表，且满足每个位于第 i 层的节点有 p 的概率出现在第 i+1 层，其中 p 为常数。

跳表在进行查找时，首先从当前的最高层 L(n) 层开始查找，在当前层水平地逐个比较直至当前节点的下一个节点大于等于目标节点，然后移动至下一层进行查找，重复这个过程直至到达第一层。此时，若下一个节点是目标节点，则成功查找；反之，则元素不存在。由于从高层往低层开始查找，由于低层出现的元素可能不会出现在高层，因此跳表在进行查找的过程中会跳过一些元素，相比于有序链表的查询，跳表的查询速度会更快。

![](/images/posts/leetecode-ll/image3.png)

下面的代码参考了Redis中跳表的实现：

```cpp
#define Skiplist_MAXLEVEL 32 /* Should be enough for 2^64 elements */
#define Skiplist_P 0.25      /* Skiplist P = 1/4 */

class Skiplist {
    //TODO 每个节点构成
    struct SkiplistNode{
        int score;
        SkiplistNode* backward;
        struct SkiplistLevel{
            SkiplistNode* forward;
        }* level;
        SkiplistNode(int levle,int score): level(new SkiplistLevel[levle]),
                                           score(score), backward(nullptr){}

        ~SkiplistNode( ){
            delete[] level;
        }
    };
    //TODO 计算随机层数的函数
    static int RandomLevel(){
        int level = 1;
        while ((rand()&0xffff)<(Skiplist_P*0xffff)){
            level+=1;
        }
        return level<Skiplist_MAXLEVEL?level:Skiplist_MAXLEVEL;
    }
    //TODO 更新update数组的函数
    SkiplistNode* UpdateHelper(SkiplistNode**  update,SkiplistNode* x,int score){
        assert(update!= nullptr&&x != nullptr);
        for(int i=this->level-1;i>=0;i--){
            while (x->level[i].forward &&
                   x->level[i].forward->score < score) {
                x = x->level[i].forward;
            }
            update[i] = x;
        }
        return x;
    }
    //TODO 删除处理时的辅助函数
    void DeleteHelper(SkiplistNode** update,SkiplistNode* x){
        assert(update!= nullptr&&x!= nullptr);
        int i;
        for(i = 0;i<this->level;i++){
            if(update[i]->level[i].forward==x){
                update[i]->level[i].forward = x->level[i].forward;
            }
        }
        //TODO 和之前的插入处理相同，如果删除的节点是末尾节点，则需要更新tail指针，如果不是，则更新backward指针
        if(x->level[0].forward){
            x->level[0].forward->backward = x->backward;
        }else{
            this->tail = x->backward;
        }
        //TODO 删除的节点可能是最高的高度，由于可能存在多个相同的高度，所以我们不能直接判断
        // 可从头节点的forward指针是否为空来确认高度是否需要下降
        while (this->level>1&&this->header.level[this->level-1].forward == nullptr)
            this->level--;
        length--;
    }
public:
		//TODO 构造和析构
    Skiplist(): header(Skiplist_MAXLEVEL,0) ,tail(nullptr)
    ,length(0),level(1){
        for (int i = 0; i < Skiplist_MAXLEVEL; ++i) {
            header.level[i].forward = nullptr;
        }
        header.backward = nullptr;
    }
    ~Skiplist(){
        SkiplistNode* node = header.level[0].forward,*next;
        while(node){
            next = node->level[0].forward;
            delete node;
            node = next;
        }
    }

		//TODO 查找函数
    bool search(int score) {
        SkiplistNode* x;
        int i;
        x = &header;
        for(i=this->level-1;i>=0;i--){
            while (x->level[i].forward&&
            x->level[i].forward->score<score){
                x = x->level[i].forward;
            }
            if(x->level[i].forward&&
            x->level[i].forward->score==score)
                return true;
        }
        return false;
    }

		//TODO 添加操作
    void add(int score) {
        SkiplistNode* update[Skiplist_MAXLEVEL],*x;
        int i,level;

        //TODO 查找插入位置，并更新update数组
        UpdateHelper(update,&header,score);

        //TODO 创建节点并插入，如果创建的节点等级比现在最高等级要高，
        // 则需要更新update数组和this.level
        level = RandomLevel();
        if(level>this->level){
            for(i=this->level;i<level;i++){
                update[i] = &header;
            }
            this->level = level;
        }
        x = new SkiplistNode(level,score);

        //TODO 根据update数组的连接指针操作
        for(i = 0;i<level;i++){
            x->level[i].forward = update[i]->level[i].forward;
            update[i]->level[i].forward = x;
        }
        /**
         * 更新backward，以及判断插入元素是否是队尾，如果是，则更新tail指针
         */
        x->backward = (update[0] == &header) ? nullptr : update[0];
        if (x->level[0].forward)
            x->level[0].forward->backward = x;
        else
            this->tail = x;
        length++;
    }
		
		//TODO 如果需要外界管理内存，则传入第二个参数
    bool erase(int score,SkiplistNode **node = nullptr) {
        SkiplistNode* update[Skiplist_MAXLEVEL],*x;
        int i;
        x = UpdateHelper(update,&header,score);
        x = x->level[0].forward;
        if(x&&x->score==score){
            DeleteHelper(update,x);
            if(!node){  //是否真正delete的抉择
                delete x;
            }else {
                *node = x;
            }
            return true;
        }
        return false;
    }
private:
    unsigned long length;
    int level;
    SkiplistNode header;//头指针
    SkiplistNode* tail;//尾指针
};

```

# 十、其他

## **48. 旋转链表**

类似旋转数组，但链表不方便进行区间reverse操作，因此考虑其他解法。

思路：先闭合成环，然后再在合适的位置断开。

```cpp
class Solution {
    
public:
    ListNode* rotateRight(ListNode* head, int k) {
        if (!head) return head;
        
        ListNode dummy(0, head);
        auto prev = &dummy;

        // 找尾节点 + 统计链表长度
        int n = 0;
        while (prev->next) {
            n++;
            prev = prev->next;
        }
        
        // 闭合成环
        prev->next = head;

        // 找到新的头节点
        k %= n;
        prev = &dummy;
        for (int i = 0; i < n-k; i++) {
            prev = prev->next;
        }
        
        // 重新断开
        head = prev->next;
        prev->next = nullptr;
        return head;
    }
};
```

## 49. **随机链表的复制**

```cpp
/*
// Definition for a Node.
class Node {
public:
    int val;
    Node* next;
    Node* random;
    
    Node(int _val) {
        val = _val;
        next = NULL;
        random = NULL;
    }
};
*/
class Solution {
public:
    Node* copyRandomList(Node* head) {
        unordered_map<Node*, Node*> mp;
        for (auto cur = head; cur; cur = cur->next) {
            mp[cur] = new Node(cur->val);
        }

        for (auto cur = head; cur; cur = cur->next) {
            mp[cur]->random = mp[cur->random];
            mp[cur]->next = mp[cur->next];
        }

        return mp[head];
    }
};
```

## 50. **链表随机节点**

**法一：辅助数组**

```cpp
class Solution {
    vector<int> arr;

public:
    Solution(ListNode *head) {
        while (head) {
            arr.emplace_back(head->val);
            head = head->next;
        }
    }

    int getRandom() {
        return arr[rand() % arr.size()];
    }
};
```

**法二：水塘抽样**

> 记住原理，能写出来就行。
> 

![](/images/posts/leetecode-ll/image.png)

```cpp
class Solution {
    ListNode *head;

public:
    Solution(ListNode *head) {
        this->head = head;
    }

    int getRandom() {
        int i = 1, ans = 0;
        for (auto node = head; node; node = node->next) {
            if (rand() % i == 0) { // 1/i 的概率选中（替换为答案）
                ans = node->val;
            }
            ++i;
        }
        return ans;
    }
};
```

## 51. **扁平化多级双向链表**

dfs递归处理：

- 使用dummy节点统一操作
- 在dfs中
    - 如果当前节点为空直接返回
    - 否则，
        - 先将当前节点插入结果链表
        - 然后递归处理child
        - 根据题目要求，需要将child置为nullptr
        - 最后再处理同层的剩余节点

时间复杂度为O(n)，空间复杂度为O(n)

```cpp
/*
// Definition for a Node.
class Node {
public:
    int val;
    Node* prev;
    Node* next;
    Node* child;
};
*/
class Solution {   
    void dfs(Node*& prev, Node* cur) {   // prev定义为引用
        while (cur) {
            auto nxt = cur->next;

            prev->next = cur;
            cur->prev = prev;
            prev = cur;

            dfs(prev, cur->child);
            cur->child = nullptr;

            cur = nxt;
        }
    }
public:
    Node* flatten(Node* head) {
        if (!head) return head;

        Node dummy;
        dummy.next = nullptr;
        dummy.prev = nullptr;

        auto prev = &dummy;
        dfs(prev, head);

        auto newHead = dummy.next;
        newHead->prev = nullptr;
        prev->next = nullptr;
        return newHead;
    }
};
```