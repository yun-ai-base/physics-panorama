// 理论·实验视图数据：历史上改变物理学的著名实验，每个实验关联一个理论节点（theoryId 对应 nodes.json）
// 正文保持中文（与项目规范一致），nameEn 供英文界面显示实验名
export const EXPERIMENTS = [
  // ── 经典物理 ──
  {
    id: 'galileo-inclined-plane', name: '伽利略斜面实验', nameEn: "Galileo's Inclined Plane",
    year: '1604', era: 'classical', theoryId: 'newton-mechanics',
    figures: ['伽利略·伽利莱'], icon: '📐',
    summary: '用斜面「冲淡」重力，让自由落体的规律可以被计时器测量',
    detail: '伽利略把小球放在逐渐放平的斜面上滚动，通过水滴节拍器计时，发现滚过的距离与时间平方成正比（s ∝ t²）——即匀加速运动。他进而推理：斜面越陡越接近自由落体，从而得出「所有物体下落加速度相同」的结论，直接挑战亚里士多德「重物落得快」的教条。这一实验确立了「用测量取代思辨」的科学方法，是牛顿力学的经验基石。',
  },
  {
    id: 'cavendish-torsion', name: '卡文迪许扭秤实验', nameEn: "Cavendish's Torsion Balance",
    year: '1798', era: 'classical', theoryId: 'newton-mechanics',
    figures: ['亨利·卡文迪许'], icon: '⚖️',
    summary: '在实验室里称量地球——测出万有引力常数 G',
    detail: '卡文迪许用一根极细的石英丝悬挂横杆，两端各置铅球，再用大铅球靠近，通过石英丝扭转角度测出两球间微弱的引力。他由此算出万有引力常数 G，并「称出」地球质量（约 6×10²⁴ 千克）与平均密度。这是第一个在实验室中直接验证万有引力定律的实验，让牛顿的平方反比律从「天体理论」变成可在地面验证的普适定律。',
  },
  {
    id: 'young-double-slit', name: '杨氏双缝实验', nameEn: "Young's Double-Slit Experiment",
    year: '1801', era: 'classical', theoryId: 'wave-optics',
    figures: ['托马斯·杨'], icon: '🌊',
    summary: '一束光经过两条狭缝，在屏上留下明暗相间的干涉条纹——光是波',
    detail: '托马斯·杨让单色光通过两条平行狭缝，在后方屏幕上观察到等间距的明暗条纹。干涉是波独有的行为：两列波峰叠加变亮、波峰与波谷相消变暗。微粒说无法解释这一现象，波动说由此复兴。条纹间距还能直接测出光的波长（约 500 纳米），使光首次成为可精确测量的对象。这是物理学史上最重要的判决性实验之一。',
  },
  {
    id: 'foucault-pendulum', name: '傅科摆实验', nameEn: "Foucault's Pendulum",
    year: '1851', era: 'classical', theoryId: 'newton-mechanics',
    figures: ['莱昂·傅科'], icon: '🧭',
    summary: '一个 67 米长的摆锤，用摆面旋转证明了地球在自转',
    detail: '傅科在巴黎先贤祠悬挂一枚 28 千克的摆锤，摆长 67 米。摆一旦开始摆动，其摆动平面会相对地面缓慢旋转（在巴黎约每小时 11°），因为地球在摆的下方自转。这个实验不需要望远镜或天文观测，在地面上就直观证明了地球绕轴自转，是经典力学惯性系的绝妙演示，也让傅科的名字与摆永远相连。',
  },
  {
    id: 'michelson-morley', name: '迈克尔逊-莫雷实验', nameEn: 'Michelson-Morley Experiment',
    year: '1887', era: 'classical', theoryId: 'michelson-morley',
    figures: ['阿尔伯特·迈克尔逊', '爱德华·莫雷'], icon: '🔭',
    summary: '想测「以太风」，结果测到零——光速不随地球运动而改变',
    detail: '迈克尔逊与莫雷用分光镜把一束光分成互相垂直的两路，再反射汇合产生干涉条纹，试图探测地球在假想「以太」中运动引起的微小光速差。实验反复进行，结果却是零：光速在一切方向相同。这一「失败」动摇了经典物理的以太观，成为狭义相对论（光速不变原理）最重要的实验先声，被爱因斯坦称为「最美丽的实验之一」。',
  },
  {
    id: 'hertz-em-waves', name: '赫兹电磁波实验', nameEn: "Hertz's Electromagnetic Wave Experiment",
    year: '1888', era: 'classical', theoryId: 'maxwell-em',
    figures: ['海因里希·赫兹'], icon: '📻',
    summary: '在实验室里造出并接收到电磁波——麦克斯韦方程组的预言成真',
    detail: '赫兹用火花隙振荡器产生高频电振荡，在数米外用一个带缺口的小环接收，观察到缺口间跳动的火花——电磁波被发射、传播并被接收。他还测出电磁波的反射、折射与干涉，并算出其传播速度等于光速。麦克斯韦在 20 多年前预言「光即电磁波」，赫兹用实验一锤定音，直接开启了无线电、雷达与全部无线通信时代。',
  },

  // ── 量子革命 ──
  {
    id: 'thomson-cathode-ray', name: '汤姆逊阴极射线实验', nameEn: "Thomson's Cathode Ray Experiment",
    year: '1897', era: 'quantum', theoryId: 'nuclear-model',
    figures: ['约瑟夫·约翰·汤姆逊'], icon: '🖥️',
    summary: '从真空管里「捉住」了比原子还小的粒子——电子',
    detail: '汤姆逊在阴极射线管中用电场与磁场同时偏转射线，通过偏转量测定其荷质比 e/m，发现该粒子质量约为氢原子的两千分之一，且与管内气体种类无关——它是一切物质的共同组分。1897 年他宣布发现「微粒」（后称电子），人类第一次打开原子内部，原子的不可分性随之瓦解，为卢瑟福核式模型与原子物理学铺平道路（1906 年诺奖）。',
  },
  {
    id: 'millikan-oil-drop', name: '密立根油滴实验', nameEn: "Millikan's Oil-Drop Experiment",
    year: '1909', era: 'quantum', theoryId: 'photoelectric',
    figures: ['罗伯特·密立根'], icon: '💧',
    summary: '让带电油滴悬浮在电场中，称出单个电子的电荷',
    detail: '密立根用喷雾器喷出微小油滴，让油滴带电后落入平行板电容器的电场中，调节电压使油滴悬停，通过平衡条件计算油滴带电量。数千次测量显示所有油滴的电量都是同一个最小单位的整数倍——电子电荷 e ≈ 1.6×10⁻¹⁹ 库仑。电荷量子化第一次被精确证实；1916 年他又用光电效应实验精确验证爱因斯坦光量子方程，获 1923 年诺奖。',
  },
  {
    id: 'rutherford-gold-foil', name: '卢瑟福α粒子散射实验', nameEn: "Rutherford's Gold Foil Experiment",
    year: '1911', era: 'quantum', theoryId: 'nuclear-model',
    figures: ['欧内斯特·卢瑟福', '汉斯·盖革', '欧内斯特·马斯登'], icon: '🎯',
    summary: '用 α 粒子轰击金箔，发现原子中间藏着一个极小极重的核',
    detail: '盖革与马斯登在卢瑟福指导下，用放射性源发射 α 粒子轰击极薄金箔，在硫化锌屏上数闪烁点。绝大多数 α 粒子直穿而过，但约八千分之一被大角度反弹——这意味着原子的正电荷与几乎全部质量集中在一个极小核内。卢瑟福据此提出原子核式模型，推翻「葡萄干布丁」模型，原子结构的现代图景由此确立。',
  },
  {
    id: 'stern-gerlach', name: '施特恩-盖拉赫实验', nameEn: 'Stern-Gerlach Experiment',
    year: '1922', era: 'quantum', theoryId: 'quantum-mechanics',
    figures: ['奥托·施特恩', '瓦尔特·盖拉赫'], icon: '🧲',
    summary: '银原子通过非均匀磁场，不是弥散成一片，而是分裂成两条',
    detail: '施特恩与盖拉赫把银原子束射入非均匀磁场，按经典理论，原子磁矩取向连续分布，屏上应得到一条弥散带；实验结果却是两条分立的谱线——原子的角动量（自旋）只能取量子化的离散方向。这是空间量子化的第一次直接实验证据，也直接导致电子自旋概念的提出，成为量子力学核心原理的经典演示。',
  },
  {
    id: 'compton-scattering', name: '康普顿散射实验', nameEn: 'Compton Scattering Experiment',
    year: '1923', era: 'quantum', theoryId: 'photoelectric',
    figures: ['阿瑟·康普顿'], icon: '🎾',
    summary: 'X 射线撞电子后波长变长——光像台球一样和电子碰撞',
    detail: '康普顿用 X 射线轰击石墨，测量不同散射角下 X 射线的波长，发现散射后波长系统地变长，且变化量只取决于散射角。若把 X 射线当作能量 E=hν、动量 p=h/λ 的光子与电子做弹性碰撞，结果与实验严丝合缝。这是光具有粒子性的最强直接证据（此前光电效应只证明能量量子化），康普顿因此与威尔逊共获 1927 年诺奖。',
  },
  {
    id: 'davisson-germer', name: '戴维森-革末实验', nameEn: 'Davisson-Germer Experiment',
    year: '1927', era: 'quantum', theoryId: 'de-broglie',
    figures: ['克林顿·戴维森', '莱斯特·革末'], icon: '🌀',
    summary: '电子打到镍晶体上发生了衍射——德布罗意的物质波被证实',
    detail: '戴维森与革末在贝尔实验室研究电子被镍表面散射时，意外发现电子强度随角度出现周期性峰，形似 X 射线衍射图样。他们意识到这是电子的波动性在起作用：衍射峰位置与德布罗意波长 λ=h/p 精确吻合。同一时期 G.P. 汤姆逊也观察到电子穿过薄膜的衍射。物质波假说由此获得判决性实验确认，薛定谔波动力学的物理基础更加坚实。',
  },

  // ── 标准模型 ──
  {
    id: 'penzias-wilson-cmb', name: '宇宙微波背景的发现', nameEn: 'Discovery of the CMB',
    year: '1965', era: 'standard-model', theoryId: 'cmb',
    figures: ['阿诺·彭齐亚斯', '罗伯特·威尔逊'], icon: '📡',
    summary: '为卫星通信调天线，意外收到来自宇宙诞生时的「余温」',
    detail: '彭齐亚斯与威尔逊调试贝尔实验室的喇叭天线时，发现无法消除的各向同性微波噪声（等效约 3K），清除了鸽子巢与设备故障后依然存在。经与普林斯顿迪克小组沟通，确认这正是宇宙大爆炸约 38 万年时留下的残余辐射。这一发现让大爆炸理论获得决定性观测支持，两人获 1978 年诺奖；后续 COBE/WMAP/Planck 卫星从这张「宇宙底片」反演出宇宙的组成与年龄。',
  },
  {
    id: 'aspect-bell', name: '贝尔不等式检验', nameEn: "Aspect's Bell Test",
    year: '1982', era: 'standard-model', theoryId: 'bell-entanglement',
    figures: ['阿兰·阿斯佩'], icon: '🎲',
    summary: '测量纠缠光子对的关联，量子力学胜出——「鬼魅超距作用」是真的',
    detail: '阿斯佩用钙原子级联辐射产生纠缠光子对，以快速切换的偏振分析仪测量贝尔不等式所涉及的关联量，结果与量子力学预言一致，明确违反贝尔不等式（S≈2.7 > 2）。这排除了局域隐变量理论对量子力学的替代，确证纠缠这种非局域关联真实存在。阿斯佩与克劳泽、塞林格因纠缠实验共享 2022 年诺奖，纠缠也成为量子通信与量子计算的核心资源。',
  },

  // ── 前沿探索 ──
  {
    id: 'super-k-neutrino', name: '超级神冈中微子实验', nameEn: 'Super-Kamiokande Neutrino Experiment',
    year: '1998', era: 'frontier', theoryId: 'neutrino-oscillation',
    figures: ['小柴昌俊'], icon: '💙',
    summary: '5 万吨水中的蓝色闪光揭示：中微子会「变身」，它有质量',
    detail: '超级神冈探测器位于地下 1000 米，用 5 万吨超纯水与上万只光电倍增管捕捉中微子撞击水分子产生的切伦科夫光环。1998 年它发现大气中微子中 μ 型中微子随传播距离「消失」——这正是中微子振荡的证据：中微子在飞行中转换了味道。振荡要求中微子有质量，直接突破标准模型的无质量假定。小柴昌俊与 SNO 实验的麦克唐纳共享 2015 年诺奖。',
  },
  {
    id: 'ligo-gw', name: 'LIGO 引力波探测', nameEn: 'LIGO Gravitational Wave Detection',
    year: '2015', era: 'frontier', theoryId: 'ligo',
    figures: ['雷纳·韦斯', '巴里·巴里什', '基普·索恩'], icon: '🌌',
    summary: '两束激光在 4 公里臂长中捕捉到时空本身的涟漪',
    detail: 'LIGO 用两座互相垂直、各长 4 公里的激光干涉仪测量引力波经过时引起的微小长度变化（约 10⁻¹⁸ 米，仅为质子直径的千分之一）。2015 年 9 月 14 日，两台探测器同时捕捉到来自 13 亿光年外两个黑洞并合的信号 GW150914，直接验证了爱因斯坦广义相对论百年前的预言。引力波天文台从此开启，韦斯、巴里什与索恩获 2017 年诺奖。',
  },
];
