# Meme Inc. 模因公司

In this game, you will design your own meme and try to let it spread through the social media. Observe the pattern of social connections, and optimize your meme to spread it as far and last as long as possible.

The game is round-based. Each round, you may add new memes to the network, adjust the recommendation algorithms, or consume your computational resources to adjust the pre-existing contents on the social media. Try to use your resources carefully and turn the luck in your favour!

## People and Social Networks

In this game, the social network is modeled as a large **graph**. In case you don't know what a graph is -- a graph is a collection of points (technically called **vertices**, plural of **vertex**) connected with lines (or **edges**). Each vertex corresponds to one social media user, and each edge corresponds to one type of connection between users.

The game records two graphs: a **friend graph** and a **follow graph**. The former records friendship bonds (imagine the people that you constantly message on social media -- they will be connected to you on this graph) and the edges are **undirected**, meaning that the friendship relation is mutual. The latter records the following bonds on public platforms (imagine the celebrities you follow on instagram -- you will be connected to them through an edge on the follow gram), and the graph is **directed**, meaning that the following relationship is one-sided -- you don't expect the celebrities you follow will also follow you back (in most cases, of course).

Of course, modeling the complete behaviours of humans is very hard. Therefore, we made some simplifications to human behaviours. Every social media user has the following attributes:

- **Interest**: interest is a collection of numbers (or a **vector**) that represents your interest in various fields. A person's interest includes these attributes: sports, music, film, drama, technology, game, fashion, and animals. Each dimension will be assigned a number between 0 to 1, representing your interest in that field. Some people have very narrow interest in only a few fields, while others might have a broad interest in all fields.
- **Preferences**: four functions that describes your preferences to cute, absurd, aggressive, and intellectual contents. The game assumes that your preferences on the four axes are Gaussian -- how much a meme excites you can be described by a bell curve. For example, if your preference to cuteness is a Gaussian centred at 0.46 with a standard deviation of 0.1, then memes with exactly 0.46 cuteness will hit your sweet spot, but memes with slightly higher or lower cuteness will also excite you, only at a lower level.
- **Personality**: personality dictates a person's reaction to a specific meme. To be more specific, personality consists of the following aspects:
  - **Trendy**: this number determines how much you will prefer memes you saw on public platforms.
  - **Tribal**: this number determines how much you want to align yourself to your community. If this number is higher, you will prefer the contents shared by your friends and community.
  - **Creativity**: this number determines how likely you will create a new meme based on the old meme templates.
  - **Novelty**: this number determines how much you like new memes. The higher the number, the less time it takes for you to get bored to repeatedly seeing the same meme.
  - **Recoverability**: this number determines how fast you forget old memes. A person with high recoverability might found the memes they saw a year ago to still be interesting, while a person with low recoverability might constantly seek unseen memes.
  - **Attention**: this number determines how many memes you can read in one game round. The higher this number is, the more 'addicted' to memes you are.

Memes can be spreaded through both friend graph and follow graph. _Trendy_ attribute mainly affects the spreading on follow graph, while _tribal_ attribute mainly affects the spreading on friend graph. A meme can also be transferred across friend graph and follow graph -- you will sometimes download the memes you saw on public platforms and repost them to your friends, right?

_Novelty_ and _recoverability_ tells two different things. They might not neccessarily contradict each other. A person can potentially have high novelty and high recoverability, in which case the person easily gets bored with a new meme they saw, forgets it, and when they revisited the meme a year later they might still find it interesting.

## Properties of Memes

Memes also have their own properties.

- **Theme**: what this meme is about. This can take the value among the list of interests we previously mentioned. Usually, a meme has only one theme, in which case the more people prefers that theme, the more they will like it. Rarely, a meme might be related to two or more themes, but this requires the meme creator to be extremely creative and has high enough interests in both themes. Memes with multiple themes will not only excite people more, but also give a small 'juxtaposition' bonus that excites viewers even more.
- **Attribute**: a list of four numbers that represents the cuteness, absurdity, aggression, and intellect of the meme.
- **Template**: this sets the limit on how much the meme is able to be changed. Some templates can accomodate memes of all sorts of themes, while other templates might be tailored to a specific style of memes.
  - **Immutability**: this describes how hard it is to recreate new memes on the meme template.
  - **Shareability**: this describes how easy it is to share the meme to others.
- ... (might need more attributes?)

## Meme Spreading

When you saw a new meme, either on the internet or from your friends, how will you react? In this game, we modeled the behaviour of meme spreading.

The list of mathematical variables we use are given in the following table.

| variable | value / explanation | meaning |
|:--------:|:-------------------:|:-------:|
| $\mathcal{G}$ | $\mathcal{G} = (\mathcal{P}, \mathcal{E}_\text{friend}, \mathcal{E}_\text{follow})$ | The social network graph |
| $\mathcal{P}$ | | The set of all people in the network |
| $\mathcal{E}_\text{friend}$ | | The friend graph |
| $\mathcal{E}_\text{follow}$ | | The follow graph |
| $\mathcal{M}$ | | Set of all memes |
| $\mathcal{I}$ | $\{\text{sports}, \cdots, \text{animals}\}$ | Set of all interests |
| $\mathcal{A}$ | $\{ {\text{cute}, \text{absurd}, \text{aggressive}, \text{intellectual}} \}$ | Set of all attributes |
| $I_{p, k}$ | $p \in \mathcal{P}, k \in \mathcal{I}$ | Person $p$'s interest in $k$ |
| $P_{p, k}$ | $p \in \mathcal{P}, k \in \mathcal{A}, P_{p, k}(x) = \frac{A_{p, k}}{\sqrt{2 \pi}\sigma_{p, k}}\exp\left(-\frac{(x - \mu_{p, k})^2}{2\sigma_{p, k}^2}\right)$ | Person $p$'s preference of attribute $k$ |
| $x_p$ | $p \in \mathcal{P}$ | The person's trendy score |
| $y_p$ | $p \in \mathcal{P}$ | The person's tribal score |
| $c_p$ | $p \in \mathcal{P}$ | The person's creativity score |
| $n_p$ | $p \in \mathcal{P}$ | The person's novelty score |
| $r_p$ | $p \in \mathcal{P}$ | The person's recoverability score |
| $a_p$ | $p \in \mathcal{P}$ | The person's attention score |
| $T_{m, k}$ | $m \in \mathcal{M}, k \in \mathcal{I}, T_{m, k} \in \{0, 1\}$ | Theme flag of meme $m$ with interest $k$ |
| $A_{m, k}$ | $m \in \mathcal{M}, k \in \mathcal{A}$ | Attribute value of meme $m$ with attribute $k$ |
| $E_{m}$ | $m \in \mathcal{M}, E_m = (\mu_m, s_m)$ | The template of meme $m$ |
| $\mu_m$ | $m \in \mathcal{M}$ | The meme's immutability |
| $s_m$ | $m \in \mathcal{M}$ | The meme's shareability |
| $M_{p, m}^{(t)}$ | $p \in \mathcal{P}, m \in \mathcal{M}$ | The person $p$'s memory of a meme $m$ at time $t$ |
| $C_p^{(t)}$ | $p \in \mathcal{P}$ | The person $p$'s cumulative creativity at time $t$ |

1. Each person has a list of seen memes. This records the memes with the person's 'memory' of that meme. The memory naturally decays with time, but seeing the meme again will increase the memory. If the memory to a meme is too strong, then seeing that same meme again will be less exciting, while seeing similar memes will be more exciting. This is the famous psychology statement that excitement arises from familiarity plus a bit of novelty.

   To be more mathematically accurate, we define $M_{p, m}$ as the person $p$'s memory of a specific meme $m$. Then, if $r_p$ is the person's recoverability and $s_{p, m}^{(t)} \in \{0, 1\}$ is a flag indicating if person $p$ sees meme $m$ at time $t$, the memory changes by:

   $$ M_{p, m}^{(t+1)} = M_{p, m}^{(t)} (1-r_p) + s_{p, m}^{(t)}$$

   If the memory decays below a specific threshold, then the meme is erased from the player memory to save computation.

2. When a person sees a new meme (either from friends or from the public media), an excitement score will be computed for that meme. The excitement score combines the person's interests, preferences, past memories, etc. To be specific, the excitement score is given by:

   $$ E_p(m) = E_{B, p} \cdot E_{J} \cdot E_{C, p} \cdot E_{N, p}^{(t)} $$

   $E_B$ is the base attractiveness.

   $$ E_{B, p} = \left(\prod_{k \in \mathcal{A}} P_{p, k} (A_{m, k})\right) \left(1 + \sum_{l \in \mathcal{I}} I_{p, l} T_{m, l}\right)$$

   $E_J$ is the juxtaposition bonus. This is related to the total number of themes in the meme $T_m = \sum_{l \in \mathcal{I}} T_{m, l}$.

   $$E_J = r^{T_m-1}$$

   Where $r$ is to be determined.

   $E_{C, p}$ is the contextual excitement bonus. $c_1$ and $c_2$ are two constants to be determined.

   $$ E_C = 1 + c_1 x_p [\text{from following}] + c_2 y_p [\text{from friend}] $$

   $E_{N, p}^{(t)}$ is the novelty score. This is where the memory comes in. The score consists of two parts, one penalising seeing familiar memes, while the other encouraging exploring novel memes.

   Define the distance metric between two memes as:

   $$ d(m_1, m_2) = k_1 \lVert T_{m_1} - T_{m_2} \rVert _2 + k_2 \lVert A_{m_1} - A_{m_2} \rVert _2 + k_3 d(E_{m_1}, E_{m_2}) $$

   $k_1, k_2, k_3$, as well as the template distance metric are to be determined.

   For a new meme $m$, the program finds the meme among the person's memory list with the closest distance to $m$, denoted by $m^*$. Then, $E_N$ is given by two terms, one to penalize familiarity and the other to reward novelty:

   $$ E_{N, p}^{(t)} = c_3 - c_4 \exp\left( -\frac{d(m, m^*)^2}{2\sigma_{\text{familiar}}^2} \right) + c_5 d(m, m^*)\exp\left( -\frac{d(m, m^*)^2}{2\sigma_{\text{novel}}^2} \right) $$

   Where $\sigma_{\text{familiar}}$ and $\sigma_{\text{novel}}$ are to be determined.

3. At each round, one person might receive multiple memes, in which case they will rank the meme by priority and pick the first few to process (determined by their _attention_ score). This is where your action can come in -- in some modes of the game, you can modify the recommendation algorithm of the platform to adjust the priority of memes that gets displayed to different users. Friendship bonds have a predefined priority which you cannot modify.

   To avoid the player simply tuning the priority all the way up to maximum and to realistically simulate real people's behaviours on social media, an extra normalisation step is added before the priorities are compared. Use $\mathcal{E}_{\text{follow}, p}$ to denote the outgoing edge from person $p$ on the follow graph, then the normalized priority of edge $e \in \mathcal{E}_{\text{follow}, p}$ is:

   $$ p_{e, \text{normalized}} = \frac{p_e}{\sum_{\epsilon \in \mathcal{E}_{\text{follow}, p}} p_{\epsilon}} $$

   The normalisation step is rationalised by the fact that every person's attention is limited. Tuning up the priority of one edge will affect the priorities being distributed to other edges.

4. If the person has a high creativity, then the person might also recreate a 'mutation' of the meme they saw. They can tailor the meme to better fit their own taste (such as shifting the cuteness toward their sweet spot) and post the new meme to others. Mutation is associated with a cost, and the more you alter from the original meme, the higher the cost is. To be specific, modifying the meme from $m$ to $m_1$ has a cost of:

   $$L(m, m_1) = \mu_m d(m, m_1)$$

   Each person has a creativity score $C_p^{(t)}$. The creativity score slowly and linearly accumulates through time, whose accumulation speed is the person's creativity $c_p$. At each time step, a random number will decide whether the person wants to mutate the meme, and then another random number decides which direction the person will mutate the meme (the second random sample should be designed such that the meme is more likely to be altered toward the person's interest). If the cumulated creativity $C$ is greater than the cost to mutate the meme $L(m, m_1)$, then the person will alter the meme and try to spread it. Or:

   $$ C_p^{(t+1)} = c_p^{(t)} + c_p - L(m, m_1)[\text{mutated }m\text{ to }m_1] $$

   If the person decide to create the new meme $m_1$, then the excitement score for evaluating whether the user will share that meme should be based on the new meme $m_1$ instead of the old meme $m$. There is also a small 'creator bonus' added to the excitement score.

5. If the excitement score exceeds a certain threshold (which is computed from the person's _trendy_ or _tribal_ attribute), then the person might decide to share it with other friends. The more exciting they are, the more likely they are to share it with their friends. A higher threshold is required for the person to share it on their public media profile, allowing their followers to see.

## Graph Construction

Before constructing the graph, we sample about 100 to 10,000 people's attributes from the following distribution:

- Interest $I_p$ is sampled on a hypersurface whose $L_1$ norm is $1$. This ensures that most people only have relatively few interests.
- The means of preferences are sampled as four independent uniform distributions on $[0, 1]$ (or will this cause any problems?). The standard deviations are sampled from a normal distribution centred at $0.5$ (to ensure that in most cases the entire region of $[0, 1]$ lies within 2 stds of the bell curve, otherwise due to the multiplicative property of the preferences in computing excitement score, there might be some memes that have extremely low excitement score no matter how you tune it).
- The personality scores are sampled from independent normal distributions, each with its specified mean and standard deviation.

After this is done, the two graphs are constructed by separate methods.

NOTE: the graph generation algorithm is still up to debate. If the current proposed algorithm does not generate a good quality social network graph, then other algorithms can be attempted.

### Friend Graph

To construct the friend graph, we first run a clustering algorithm with $k$ centres. After a few iterations finding the optimal centre location, we run a stochastic assignment of centres for each person -- the nearest few centres are selected, weighted by the inverse distance, and randomly sampled. After the people are assigned to the centres, the small-world network algorithm is run on the collection of people. This procedure is ran multiple times, each time with a different scale of $k$.

### Follow Graph

The procedure of generating scale-invariant graphs is applied here, where each new connection is added based on the degree of previous connections. However, in this model, the proximity of interests is also considered so that people are more likely to follow the influencers that shares the same interests as them.

## Recommendation Algorithms

TODO

## UI Design

The project runs on web pages, built with node.js and Astro. The screen is divided into two regions: A main panel occupying roughly 70% of width and a side panel occupying roughly 30% width. The main panel is for rendering the graph and for user to interact with it. The side panel is for displaying the information of specific players, connections, etc.

A small tool bar is placed below the canvas that shows the graph. It controls the color scheme, showing/hiding edges, resetting view, and other utility tools for inspecting the graph.

Several colouring options are available:

1. Colouring by interest. Each interest is assigned with a colour, and the nodes are coloured by the linear interpolation of the interest colours.
2. Colouring by preference. Each node is coloured by the linear interpolation of its preference to cute, absurd, aggressive, and intellectual contents.
3. Colouring by meme memory. The player is able to select a meme and see its infected population. Each node is coloured by its memory value of the specific meme.
4. ...

When the player selects a person/node on the graph, the info panel displays all the person's attributes, either as progress bars (for numbers) or plots (for graphs/distributions). The list of memes in the player's memory is also displayed.

When no nodes are selected, the info panel shows the global controls the player can change, including adjusting the recommendation algorithm.
