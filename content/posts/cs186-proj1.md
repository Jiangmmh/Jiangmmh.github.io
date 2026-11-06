---
title: "UCB CS186 Project 1：SQL "
date: '2026-11-06T20:57:50+08:00'
draft: false
tags: [SQL, UCB-CS186]
categories: [数据库]
---

# 一、项目介绍

[UCB CS186: Introduction to Database Systems](https://cs186berkeley.net/) 是加州大学伯克利分校开设的数据库系统课程。课程通过理论讲解与编程项目相结合的方式，帮助学生理解数据库系统的设计与实现。

Project 1 主要围绕 SQL 展开，通过查询真实数据集，练习关系型数据库中最常用的查询操作。

本项目使用 Lahman Baseball Database，包含了大量美国职业棒球运动员的个人信息、比赛记录、球队信息、薪资以及名人堂入选记录等数据。

项目主要涉及以下 SQL 知识：

- 基础查询：`SELECT`、`WHERE`、`ORDER BY`；
- 聚合查询：`GROUP BY`、`HAVING`、`COUNT`、`SUM`、`AVG`；
- 多表查询：`INNER JOIN`、`LEFT JOIN`；
- 子查询与公共表表达式：`WITH`、`CTE`；
- 窗口函数：`LAG()`；
- 条件表达式：`CASE WHEN`；
- 数据分桶与统计分析。

虽然这些内容都是 SQL 的基础知识，但通过本项目，可以进一步理解如何将实际业务需求转换为关系代数和 SQL 查询。

## 1.1 环境准备

首先拉取项目仓库：

```bash
git clone https://github.com/berkeley-cs186/sp26-proj1.git
cd sp26-proj1
```

下载数据库文件：[lahman.db](https://github.com/songsi1111/CS186-proj1/blob/main/lahman.db)

将数据库文件放到项目要求的位置。

本项目使用 SQLite，因此可以直接使用 SQLite 命令行工具查看数据库。

```bash
sqlite3 lahman.db
```

查看数据库中的表：

```sql
.tables
```

查看表结构：

```sql
.schema people
.schema batting
.schema salaries
```

也可以直接查询部分数据：

```sql
SELECT *
FROM people
LIMIT 10;
```

建议在正式开始之前，先了解数据表的结构以及表之间的关联关系。对于数据库查询任务而言，理解数据模型往往比直接编写 SQL 更重要。

# 二、Task 1：Basics

Task 1 主要考察 SQL 的基础查询和聚合操作，包括条件过滤、字符串匹配、分组统计以及分组过滤。

## 2.1 Question 1i：基础条件查询

**题目要求：**

在 `people` 表中，查询体重超过 300 磅的所有运动员，返回：

- `namefirst`
- `namelast`
- `birthyear`

```sql
-- Question 1i
CREATE VIEW q1i(namefirst, namelast, birthyear) AS
SELECT nameFirst, nameLast, birthYear
FROM people
WHERE weight > 300;
```

这是一道最基础的 SQL 查询。

通过 `SELECT` 指定需要返回的字段，通过 `FROM` 指定数据来源，再使用 `WHERE` 过滤满足条件的记录。

这里需要注意：

**WHERE 用于过滤原始记录，而不是过滤聚合后的分组结果。**

## 2.2 Question 1ii：字符串匹配

**题目要求：**

找出 `namefirst` 字段中包含空格的运动员，返回姓名和出生年份。

结果按照 `namefirst` 升序排列，如果 `namefirst` 相同，则按照 `namelast` 升序排列。

```sql
-- Question 1ii
CREATE VIEW q1ii(namefirst, namelast, birthyear) AS
SELECT namefirst, namelast, birthyear
FROM people
WHERE namefirst LIKE '% %'
ORDER BY namefirst ASC, namelast ASC;
```

这里使用 `LIKE` 进行字符串模式匹配。

SQL 中常用的两个通配符：

| 通配符 | 含义 |
|---|---|
| `%` | 匹配任意长度的字符串，包括空字符串 |
| `_` | 匹配任意单个字符 |

例如：

```sql
-- 以 A 开头
WHERE namefirst LIKE 'A%'

-- 以 A 结尾
WHERE namefirst LIKE '%A'

-- 包含字符串 abc
WHERE namefirst LIKE '%abc%'

-- 第二个字符为 a
WHERE namefirst LIKE '_a%'
```

本题：

```sql
WHERE namefirst LIKE '% %'
```

表示匹配任意位置包含空格的字符串。

另外，`ORDER BY` 可以指定多个排序字段，后面的字段用于前面的字段出现相同值时进一步排序。

## 2.3 Question 1iii：GROUP BY 分组聚合

**题目要求：**

按照运动员的 `birthyear` 分组，计算每个出生年份对应的：

- 平均身高 `avgheight`；
- 运动员数量 `count`。

最后按照出生年份升序排列。

```sql
-- Question 1iii
CREATE VIEW q1iii(birthyear, avgheight, count) AS
SELECT
    birthyear,
    AVG(height) AS avgheight,
    COUNT(*) AS count
FROM people
GROUP BY birthyear
ORDER BY birthyear ASC;
```

本题考察 `GROUP BY` 和聚合函数。

`GROUP BY birthyear` 会将出生年份相同的记录划分到同一个分组中。

然后对每个分组分别执行聚合计算：

| 函数 | 含义 |
|---|---|
| `COUNT(*)` | 统计分组中的记录数量 |
| `SUM(column)` | 计算指定字段的总和 |
| `AVG(column)` | 计算平均值 |
| `MIN(column)` | 计算最小值 |
| `MAX(column)` | 计算最大值 |

例如：

```sql
SELECT birthyear, COUNT(*)
FROM people
GROUP BY birthyear;
```

需要注意：没有指定 `GROUP BY` 时，聚合函数通常会对整个查询结果进行聚合；指定 `GROUP BY` 后，则会对每个分组分别进行聚合。

## 2.4 Question 1iv：HAVING 分组过滤

**题目要求：**

在 Question 1iii 的基础上，只保留平均身高大于 70 英寸的出生年份分组。

```sql
-- Question 1iv
CREATE VIEW q1iv(birthyear, avgheight, count) AS
SELECT
    birthyear,
    AVG(height) AS avgheight,
    COUNT(*) AS count
FROM people
GROUP BY birthyear
HAVING AVG(height) > 70
ORDER BY birthyear ASC;
```

这里引入了一个重要概念：`HAVING`。

`WHERE` 和 `HAVING` 都可以用于过滤，但它们的作用阶段不同：

- `WHERE`：在分组和聚合之前过滤原始记录；
- `HAVING`：在分组和聚合之后过滤分组。

例如：

```sql
SELECT birthyear, AVG(height)
FROM people
WHERE height IS NOT NULL
GROUP BY birthyear
HAVING AVG(height) > 70;
```

执行逻辑：

1. `WHERE` 首先过滤掉身高为空的记录；
2. `GROUP BY` 按出生年份分组；
3. `AVG()` 计算每组的平均身高；
4. `HAVING` 过滤平均身高不超过 70 的分组。

这是 SQL 中非常重要的区别。

# 三、Task 2：Hall of Fame Schools

Task 2 开始涉及多表查询，需要根据不同表之间的关联关系获取完整信息。

主要考察：

- `INNER JOIN`；
- `LEFT JOIN`；
- 多表关联；
- NULL 值处理。

## 3.1 Question 2i：INNER JOIN

**题目要求：**

找出所有成功入选棒球名人堂（Hall of Fame）的运动员，返回：

- `namefirst`
- `namelast`
- `playerid`
- `yearid`

按照入选年份降序排列，年份相同时按照 `playerid` 升序排列。

涉及两张表：

- `people`：运动员个人信息；
- `halloffame`：名人堂相关记录。

```sql
-- Question 2i
CREATE VIEW q2i(namefirst, namelast, playerid, yearid) AS
SELECT
    P.namefirst,
    P.namelast,
    P.playerid,
    H.yearid
FROM people AS P
INNER JOIN halloffame AS H
    ON P.playerid = H.playerid
WHERE H.inducted = 'Y'
ORDER BY H.yearid DESC, P.playerid ASC;
```

这里使用 `INNER JOIN` 将两张表关联起来。

```sql
ON P.playerid = H.playerid
```

表示通过 `playerid` 建立关联关系。

`INNER JOIN` 只保留两张表中满足连接条件的记录。

可以将其理解为：

```text
people                       halloffame
+----------+                 +----------+
| playerid |                 | playerid |
+----------+                 +----------+
| A        |                 | A        |
| B        |                 | C        |
| C        |                 | D        |
+----------+                 +----------+

             INNER JOIN

             +----------+
             | playerid |
             +----------+
             | A        |
             | C        |
             +----------+
```

最后：

```sql
WHERE H.inducted = 'Y'
```

只保留成功入选名人堂的记录。

### 另一种写法：隐式 JOIN

也可以使用传统的隐式连接语法：

```sql
CREATE VIEW q2i(namefirst, namelast, playerid, yearid) AS
SELECT
    P.namefirst,
    P.namelast,
    P.playerid,
    H.yearid
FROM people AS P, halloffame AS H
WHERE P.playerid = H.playerid
  AND H.inducted = 'Y'
ORDER BY H.yearid DESC, P.playerid ASC;
```

这种写法本质上是先形成两张表的笛卡尔积，再通过 `WHERE` 筛选满足关联条件的记录。

实际开发中，更推荐显式 `JOIN`：

- 连接条件与过滤条件分离；
- SQL 结构更清晰；
- 多表查询更容易维护；
- 不容易遗漏连接条件而产生笛卡尔积。

## 3.2 Question 2ii：多表 INNER JOIN

**题目要求：**

找出所有成功入选名人堂，并且曾经在加利福尼亚州（California）的大学打过球的运动员。

返回：

- `namefirst`
- `namelast`
- `playerid`
- `schoolid`
- `yearid`

其中 `yearid` 表示入选名人堂的年份。

本题涉及四张表：

| 表名 | 作用 |
|---|---|
| `people` | 运动员个人信息 |
| `halloffame` | 名人堂入选记录 |
| `collegeplaying` | 运动员大学参赛记录 |
| `schools` | 大学信息 |

查询：

```sql
-- Question 2ii
CREATE VIEW q2ii(namefirst, namelast, playerid, schoolid, yearid) AS
SELECT
    P.namefirst,
    P.namelast,
    P.playerid,
    S.schoolid,
    H.yearid
FROM people AS P
JOIN halloffame AS H
    ON P.playerid = H.playerid
JOIN collegeplaying AS C
    ON P.playerid = C.playerid
JOIN schools AS S
    ON C.schoolid = S.schoolid
WHERE H.inducted = 'Y'
  AND S.schoolState = 'CA'
ORDER BY H.yearid DESC, S.schoolid ASC, P.playerid ASC;
```

本题的核心是理解四张表之间的关联关系：

```text
             +----------+
             |  people  |
             +----------+
                  |
              playerid
                  |
          +---------------+
          |  halloffame   |
          +---------------+

             +----------+
             |  people  |
             +----------+
                  |
              playerid
                  |
          +---------------+
          | collegeplaying|
          +---------------+
                  |
               schoolid
                  |
             +----------+
             | schools  |
             +----------+
```

最终通过：

```sql
S.schoolState = 'CA'
```

过滤出位于加州的大学。

这里还有一个值得注意的地方：多表 JOIN 并不意味着一条运动员记录最终只会对应一行。

如果一个运动员曾经在多所加州大学打过球，那么查询结果中可能出现多条记录。这取决于底层数据的关联关系以及题目要求的结果粒度。

## 3.3 Question 2iii：LEFT JOIN 与 NULL

**题目要求：**

找出所有成功入选名人堂的运动员，无论其是否在大学打过球。

返回：

- `playerid`
- `namefirst`
- `namelast`
- `schoolid`

如果运动员没有大学参赛记录，则 `schoolid` 应为 `NULL`。

这道题的关键在于：如何保留没有匹配记录的运动员？

如果使用 `INNER JOIN`，没有大学参赛记录的运动员就会被过滤掉。

因此，需要使用 `LEFT JOIN`。

```sql
-- Question 2iii
CREATE VIEW q2iii(playerid, namefirst, namelast, schoolid) AS
SELECT
    P.playerid,
    P.namefirst,
    P.namelast,
    C.schoolid
FROM people AS P
INNER JOIN halloffame AS H
    ON P.playerid = H.playerid
    AND H.inducted = 'Y'
LEFT JOIN collegeplaying AS C
    ON P.playerid = C.playerid
ORDER BY P.playerid DESC, C.schoolid ASC;
```

`LEFT JOIN` 的核心语义：

以左侧表为基准，保留左侧表的所有记录。

如果右侧表存在匹配记录，则正常返回；如果不存在，则右侧表对应的字段填充为 `NULL`。

例如：

```text
people                       collegeplaying
+----------+                 +----------+----------+
| playerid |                 | playerid | schoolid |
+----------+                 +----------+----------+
| A        |                 | A        | S1       |
| B        |                 | C        | S2       |
| C        |                 +----------+----------+
+----------+

              LEFT JOIN

+----------+----------+
| playerid | schoolid |
+----------+----------+
| A        | S1       |
| B        | NULL     |
| C        | S2       |
+----------+----------+
```

本题通过：

```sql
LEFT JOIN collegeplaying AS C
    ON P.playerid = C.playerid
```

保证没有大学参赛记录的名人堂运动员仍然会出现在结果中。

需要特别注意 `LEFT JOIN` 与 `WHERE` 的组合。

例如：

```sql
SELECT *
FROM people P
LEFT JOIN collegeplaying C
    ON P.playerid = C.playerid
WHERE C.schoolid = 'S1';
```

这实际上会过滤掉右表没有匹配记录的行，因为 `NULL = 'S1'` 不成立。

因此，如果需要保留左表中的全部记录，应当仔细考虑过滤条件放在 `ON` 还是 `WHERE` 中。

# 四、Task 3：SaberMetrics

Task 3 主要考察 SQL 聚合计算和统计指标的实现。

本题围绕棒球统计指标 Slugging Percentage（SLG，长打率）展开。

## 4.1 Question 3i：计算年度 SLG

**题目要求：**

找出历史上单赛季 SLG 最高的 10 条记录。

返回：

- `playerid`
- `namefirst`
- `namelast`
- `yearid`
- `slg`

要求：

- 单赛季打数（AB）必须大于 50；
- 按照 SLG 降序排列；
- SLG 相同时，按照 `yearid`、`playerid` 升序排列；
- 同一运动员可以出现多次，因为不同赛季分别计算。

### SLG 的计算公式

SLG 用于衡量击球手的长打能力。

公式为：

\[
SLG = \frac{1B+2\times 2B+3\times 3B+4\times HR}{AB}
\]

其中：

- `1B`：一垒安打；
- `2B`：二垒安打；
- `3B`：三垒安打；
- `HR`：本垒打；
- `AB`：打数。

在 `batting` 表中，相关字段包括：

| 字段 | 含义 |
|---|---|
| `H` | 安打总数 |
| `H2B` | 二垒安打数 |
| `H3B` | 三垒安打数 |
| `HR` | 本垒打数 |
| `AB` | 打数 |

由于：

\[
H=1B+2B+3B+HR
\]

因此：

\[
1B=H-H2B-H3B-HR
\]

代入 SLG 公式：

\[
SLG=\frac{H+H2B+2H3B+3HR}{AB}
\]

对应 SQL：

```sql
-- Question 3i
CREATE VIEW q3i(playerid, namefirst, namelast, yearid, slg) AS
SELECT
    P.playerid,
    P.namefirst,
    P.namelast,
    B.yearid,
    ROUND(
        (B.H + B.H2B + 2 * B.H3B + 3 * B.HR + 0.0) / B.AB,
        4
    ) AS slg
FROM batting AS B
JOIN people AS P
    ON B.playerid = P.playerid
WHERE B.AB > 50
ORDER BY slg DESC, B.yearid ASC, P.playerid ASC
LIMIT 10;
```

这里有两个值得注意的细节。

**1. 为什么要添加 `0.0`？**

SQLite 中，如果参与运算的数值都是整数，整数除法可能会导致小数部分丢失。

例如：

```sql
SELECT 5 / 2;
```

结果为：

```text
2
```

而：

```sql
SELECT 5 / 2.0;
```

结果为：

```text
2.5
```

因此，通过添加 `0.0`，确保计算过程中使用浮点数除法。

**2. 为什么不能按照 playerid 分组？**

题目要求统计的是单赛季 SLG，而不是整个职业生涯的 SLG。

因此，每一条 `batting` 记录都代表一个运动员在某个赛季的表现，不应该将不同赛季的数据聚合在一起。

另外：

```sql
LIMIT 10
```

用于限制最终返回的记录数量。

## 4.2 Question 3ii：计算 Lifetime SLG

**题目要求：**

计算每位运动员整个职业生涯的 Lifetime Slugging Percentage（LSLG），找出最高的 10 位运动员。

与上一题不同，这里需要将一个运动员所有赛季的数据进行汇总。

计算公式不变：

\[
LSLG=\frac{H+H2B+2H3B+3HR}{AB}
\]

但这里的所有字段都需要使用整个职业生涯的累计值。

```sql
-- Question 3ii
CREATE VIEW q3ii(playerid, namefirst, namelast, lslg) AS
SELECT
    P.playerid,
    P.namefirst,
    P.namelast,
    ROUND(
        (
            SUM(B.H)
            + SUM(B.H2B)
            + 2 * SUM(B.H3B)
            + 3 * SUM(B.HR)
            + 0.0
        ) / SUM(B.AB),
        4
    ) AS lslg
FROM people AS P
JOIN batting AS B
    ON P.playerid = B.playerid
GROUP BY P.playerid, P.namefirst, P.nameLast
HAVING SUM(B.AB) > 50
ORDER BY lslg DESC, P.playerid ASC
LIMIT 10;
```

这里的关键在于：

```sql
GROUP BY P.playerid, P.namefirst, P.nameLast
```

将同一个运动员的所有赛季记录合并到一个分组中。

然后使用：

```sql
SUM(B.H)
SUM(B.H2B)
SUM(B.H3B)
SUM(B.HR)
SUM(B.AB)
```

分别计算职业生涯的累计数据。

最后再计算 LSLG。

需要注意，这里使用 `HAVING` 而不是 `WHERE`：

```sql
HAVING SUM(B.AB) > 50
```

因为我们需要过滤的是累计打数，而累计打数只有在分组聚合之后才能得到。

另外，按照题目要求保留了总打数大于 50 的限制。

## 4.3 Question 3iii：使用子查询进行比较

**题目要求：**

找出整个职业生涯 LSLG 高于 Willie Mays 的运动员。

返回：

- `namefirst`
- `namelast`
- `lslg`

这道题的核心在于：如何将一个查询的结果作为另一个查询的比较条件？

首先，需要计算 Willie Mays 的职业生涯 LSLG。

其 `playerid` 为：

```text
mayswi01
```

可以使用子查询完成：

```sql
SELECT
    (
        SUM(H)
        + SUM(H2B)
        + 2 * SUM(H3B)
        + 3 * SUM(HR)
        + 0.0
    ) / SUM(AB)
FROM batting
WHERE playerid = 'mayswi01';
```

然后将这个查询作为外层查询的比较条件。

完整实现：

```sql
-- Question 3iii
CREATE VIEW q3iii(namefirst, namelast, lslg) AS
WITH career AS (
    SELECT
        P.playerid,
        P.namefirst,
        P.namelast,
        (
            SUM(B.H)
            + SUM(B.H2B)
            + 2 * SUM(B.H3B)
            + 3 * SUM(B.HR)
            + 0.0
        ) / SUM(B.AB) AS raw_lslg
    FROM people AS P
    JOIN batting AS B
        ON P.playerid = B.playerid
    GROUP BY P.playerid, P.namefirst, P.namelast
    HAVING SUM(B.AB) > 50
),
willie AS (
    SELECT raw_lslg
    FROM career
    WHERE playerid = 'mayswi01'
)
SELECT
    namefirst,
    namelast,
    ROUND(raw_lslg, 4) AS lslg
FROM career
WHERE raw_lslg > (SELECT raw_lslg FROM willie)
ORDER BY playerid ASC;
```

这里使用了 CTE（Common Table Expression，公共表表达式）。

通过：

```sql
WITH career AS (...)
```

先计算所有运动员的职业生涯 LSLG。

然后：

```sql
willie AS (...)
```

从中提取 Willie Mays 的 LSLG。

最后：

```sql
WHERE raw_lslg > (SELECT raw_lslg FROM willie)
```

筛选出 LSLG 更高的运动员。

这里还值得注意一个精度问题：

**应该使用未经过四舍五入的原始 LSLG 进行比较，最后再对输出结果进行 ROUND。**

否则，如果两个运动员的原始 LSLG 非常接近，提前四舍五入可能改变比较结果。

# 五、Task 4：Salaries

Task 4 主要考察 SQL 在数据分析场景中的应用，包括统计分析、数据分桶、窗口函数以及多表聚合。

## 5.1 Question 4i：年度薪资统计

**题目要求：**

按照年份统计所有运动员的薪资情况，返回：

- `yearid`
- 最低薪资；
- 最高薪资；
- 平均薪资。

```sql
-- Question 4i
CREATE VIEW q4i(yearid, min, max, avg) AS
SELECT
    yearid,
    MIN(salary),
    MAX(salary),
    AVG(salary)
FROM salaries
GROUP BY yearid
ORDER BY yearid ASC;
```

这道题比较简单。

通过 `GROUP BY yearid` 按照年份分组，再分别使用 `MIN()`、`MAX()` 和 `AVG()` 计算每年的薪资统计数据。

这里没有太多新的知识点，重点是熟悉聚合函数的使用。

## 5.2 Question 4ii：薪资直方图（Histogram）

**题目要求：**

计算 2016 年所有运动员薪资的直方图。

将薪资范围从最小值到最大值划分为 10 个等宽区间，编号为 0～9。

返回：

- `binid`：区间编号；
- `low`：区间下界；
- `high`：区间上界；
- `count`：区间中的薪资记录数量。

这道题稍微复杂一些，因为需要先计算统计信息，再根据统计信息构造区间，最后将每条记录划分到对应区间。

这里使用 `WITH` 构建多个 CTE，将复杂查询拆分成多个步骤。

### 第一步：计算最大值和最小值

```sql
WITH stats AS (
    SELECT
        MIN(salary) AS min_sal,
        MAX(salary) AS max_sal
    FROM salaries
    WHERE yearid = 2016
)
```

得到 2016 年的最低薪资和最高薪资。

### 第二步：计算区间宽度

```sql
bounds AS (
    SELECT
        min_sal,
        max_sal,
        (max_sal - min_sal) / 10.0 AS width
    FROM stats
)
```

区间宽度：

\[
width=\frac{max\_salary-min\_salary}{10}
\]

例如，如果薪资范围为：

\[
[100000,1100000]
\]

那么：

\[
width=100000
\]

### 第三步：生成每条记录对应的 binid

对于某个薪资 `salary`，其所在区间可以通过下面的公式计算：

\[
binid=
\left\lfloor
\frac{salary-min\_salary}{width}
\right\rfloor
\]

例如：

```sql
CAST((salary - min_sal) / width AS INT)
```

SQLite 中将非负浮点数转换为整数时会截断小数部分，因此这里可以用来得到区间编号。

需要注意，最大薪资恰好位于最右边界，计算出的编号可能为 10，而合法编号只有 0～9。

因此需要特殊处理：

```sql
CASE
    WHEN binid >= 10 THEN 9
    ELSE binid
END
```

### 第四步：完整实现

还需要注意一个细节：题目要求即使某个区间没有薪资记录，也需要返回该区间，并将数量设置为 0。

因此，我们先生成完整的 0～9 区间，再使用 `LEFT JOIN` 连接实际统计结果。

```sql
-- Question 4ii
CREATE VIEW q4ii(binid, low, high, count) AS
WITH RECURSIVE
stats AS (
    SELECT
        MIN(salary) AS min_sal,
        MAX(salary) AS max_sal
    FROM salaries
    WHERE yearid = 2016
),
bounds AS (
    SELECT
        min_sal,
        max_sal,
        (max_sal - min_sal) / 10.0 AS width
    FROM stats
),
binids(binid) AS (
    SELECT 0
    UNION ALL
    SELECT binid + 1
    FROM binids
    WHERE binid < 9
),
binned AS (
    SELECT
        CASE
            WHEN CAST((s.salary - b.min_sal) / b.width AS INT) >= 10
                THEN 9
            ELSE CAST((s.salary - b.min_sal) / b.width AS INT)
        END AS binid,
        COUNT(*) AS cnt
    FROM salaries AS s
    CROSS JOIN bounds AS b
    WHERE s.yearid = 2016
    GROUP BY binid
)
SELECT
    bi.binid,
    b.min_sal + bi.binid * b.width AS low,
    b.min_sal + (bi.binid + 1) * b.width AS high,
    COALESCE(bd.cnt, 0) AS count
FROM binids AS bi
CROSS JOIN bounds AS b
LEFT JOIN binned AS bd
    ON bi.binid = bd.binid
ORDER BY bi.binid ASC;
```

这里涉及几个值得掌握的 SQL 技巧：

**1. CTE：将复杂查询拆分为多个步骤。**

通过 `WITH`，可以将一个复杂查询拆分成多个具有独立语义的中间结果。

相比嵌套多层子查询，CTE 通常更容易阅读和维护。

**2. CROSS JOIN：构造笛卡尔积。**

```sql
FROM salaries AS s
CROSS JOIN bounds AS b
```

由于 `bounds` 只有一条记录，因此相当于将统计信息附加到每条薪资记录上。

**3. CASE WHEN：条件表达式。**

用于处理最大薪资落入最后一个区间的边界情况。

**4. COALESCE：处理 NULL。**

```sql
COALESCE(bd.cnt, 0)
```

如果某个区间没有对应记录，`LEFT JOIN` 会产生 `NULL`。

`COALESCE` 会将其转换成 0。

**5. 递归 CTE：生成连续编号。**

```sql
binids(binid) AS (
    SELECT 0
    UNION ALL
    SELECT binid + 1
    FROM binids
    WHERE binid < 9
)
```

最终生成：

```text
0, 1, 2, 3, 4, 5, 6, 7, 8, 9
```

这是 SQL 中一种非常实用的序列生成方式。

## 5.3 Question 4iii：窗口函数 LAG()

**题目要求：**

计算每一年相对于上一个有薪资记录的年份，其最低薪资、最高薪资和平均薪资的变化量。

返回：

- `yearid`
- `mindiff`
- `maxdiff`
- `avgdiff`

跳过第一个有记录的年份。

这道题非常适合使用窗口函数（Window Function）。

首先计算每年的薪资统计数据，然后获取上一年的统计值，最后计算差值。

```sql
-- Question 4iii
CREATE VIEW q4iii(yearid, mindiff, maxdiff, avgdiff) AS
WITH yearly AS (
    SELECT
        yearid,
        MIN(salary) AS minsal,
        MAX(salary) AS maxsal,
        AVG(salary) AS avgsal
    FROM salaries
    GROUP BY yearid
),
with_prev AS (
    SELECT
        yearid,
        minsal,
        maxsal,
        avgsal,
        LAG(minsal) OVER (ORDER BY yearid) AS prev_min,
        LAG(maxsal) OVER (ORDER BY yearid) AS prev_max,
        LAG(avgsal) OVER (ORDER BY yearid) AS prev_avg
    FROM yearly
)
SELECT
    yearid,
    minsal - prev_min AS mindiff,
    maxsal - prev_max AS maxdiff,
    avgsal - prev_avg AS avgdiff
FROM with_prev
WHERE prev_min IS NOT NULL
ORDER BY yearid ASC;
```

这里重点介绍 `LAG()`。

### LAG() 是什么？

`LAG()` 是 SQL 窗口函数，用于获取当前行之前某一行的数据。

基本语法：

```sql
LAG(expression, offset, default)
OVER (
    PARTITION BY ...
    ORDER BY ...
)
```

其中：

- `expression`：需要获取的字段；
- `offset`：向前偏移多少行，默认是 1；
- `default`：不存在对应行时返回的默认值；
- `ORDER BY`：定义窗口内的数据顺序。

例如：

```sql
SELECT
    yearid,
    salary,
    LAG(salary) OVER (ORDER BY yearid) AS prev_salary
FROM salaries;
```

可以获取上一行的薪资。

本题首先通过 `yearly` CTE 聚合