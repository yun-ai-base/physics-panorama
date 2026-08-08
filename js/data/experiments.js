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

  // ── 2026-08-08 补充：天文观测型 + 更多经典/近代实验 ──
  {
    id: 'newton-prism', name: '牛顿棱镜色散实验', nameEn: "Newton's Prism Experiment",
    year: '1666', era: 'classical', theoryId: 'wave-optics',
    figures: ['艾萨克·牛顿'], icon: '🌈',
    summary: '一束白光穿过三棱镜，被分解成七色光谱——光不是纯净单一的',
    detail: '牛顿让一束太阳光穿过小孔射入三棱镜，在白墙上看到展开的彩色光谱；再用第二块棱镜尝试「还原」，发现光谱无法再被分解——白光是由不同颜色的光混合而成，颜色是光的固有属性而非棱镜「染色」。他由此推断光由不同折射率的微粒组成（微粒说），虽然后来微粒说被波动说取代，但色散实验本身确立了对光的定量研究，也是光谱学的起点。',
  },
  {
    id: 'roemer-light-speed', name: '罗默木卫食光速测量', nameEn: "Rømer's Speed of Light Measurement",
    year: '1676', era: 'classical', theoryId: 'wave-optics',
    figures: ['奥勒·罗默'], icon: '⏱️',
    summary: '用木星卫星的「迟到」，第一次算出光速是有限的',
    detail: '罗默长期观测木星卫星木卫一的掩食周期，发现当地球远离木星时，木卫一的掩食总是「迟到」约 16 分钟——他正确解释为光跨越地球轨道直径需要时间，并估算出光速约 2.2×10⁸ 米/秒（现代值 3×10⁸）。这是人类第一次证明光速有限并给出量级，为日后一切光速相关的物理（相对论、电磁波）埋下伏笔。',
  },
  {
    id: 'brownian-motion', name: '布朗运动观测', nameEn: 'Brownian Motion Observation',
    year: '1827', era: 'classical', theoryId: 'stat-mechanics',
    figures: ['罗伯特·布朗'], icon: '🌱',
    summary: '花粉微粒在水中的无规则运动，成了原子存在的直接证据',
    detail: '植物学家布朗在显微镜下观察到悬浮于水中的花粉微粒做永不停息的无规则运动，起初以为发现「生命微粒」，后证实是无机微粒同样如此。1905 年爱因斯坦给出定量理论：这种运动来自水分子热运动的随机碰撞；1908 年佩兰的精密测量与理论完全吻合，并由此测出阿伏伽德罗常数——原子-分子论从假说变为观测事实，佩兰获 1926 年诺奖。',
  },
  {
    id: 'joule-heat-equivalent', name: '焦耳热功当量实验', nameEn: "Joule's Mechanical Equivalent of Heat",
    year: '1843', era: 'classical', theoryId: 'thermodynamics',
    figures: ['詹姆斯·焦耳'], icon: '🔥',
    summary: '搅拌水桶里下沉的重锤，证明热是一种能量形式',
    detail: '焦耳用一系列装置——下落的重锤带动叶片搅拌水、电流通过电阻丝发热——精确测量机械功与产生热量的换算关系，得到热功当量约 4.2 焦耳/卡。这证明热不是神秘的「热质」，而是能量的一种形式，为能量守恒定律提供了定量基础，也直接支撑了热力学第一定律的建立。焦耳的名字从此成为能量单位。',
  },
  {
    id: 'photoelectric-effect', name: '光电效应实验', nameEn: 'Photoelectric Effect Experiment',
    year: '1887', era: 'quantum', theoryId: 'photoelectric',
    figures: ['海因里希·赫兹', '菲利普·莱纳德', '罗伯特·密立根'], icon: '☀️',
    summary: '光照金属打出电子——但电子的能量只取决于光的颜色，与亮度无关',
    detail: '1887 年赫兹在验证电磁波时偶然发现：紫外线照射火花隙会使其更容易放电（光电效应）。随后研究发现：只有频率超过某个阈值的「颜色」的光才能打出电子，电子动能随频率线性增加，却与光强无关——这违背经典波动理论（光强越大能量应越大）。1905 年爱因斯坦用光量子假说完美解释，1916 年密立根以精确实验验证爱因斯坦方程（尽管他想证伪它）。光电效应因此成为量子概念最有力的实验支柱。',
  },
  {
    id: 'franck-hertz', name: '弗兰克-赫兹实验', nameEn: 'Franck-Hertz Experiment',
    year: '1914', era: 'quantum', theoryId: 'bohr-model',
    figures: ['詹姆斯·弗兰克', '古斯塔夫·赫兹'], icon: '🪜',
    summary: '电子撞汞原子：能量只能一份份地交出去——原子能级是量子化的',
    detail: '弗兰克与赫兹让电子在汞蒸气中加速，测量穿过气体的电子流。当加速电压达到 4.9 伏时，电子流突然下降——电子把正好 4.9 电子伏的能量「整份」交给了汞原子，激发其到第一激发态。这是原子内部能量量子化的直接实验证据：原子只能吸收特定大小的能量，与玻尔原子模型的能级假设互相印证。两人获 1925 年诺奖。',
  },
  {
    id: 'eddington-eclipse', name: '爱丁顿日全食观测', nameEn: "Eddington's 1919 Eclipse Expedition",
    year: '1919', era: 'relativity', theoryId: 'general-relativity',
    figures: ['亚瑟·爱丁顿'], icon: '🌑',
    summary: '日全食时星光擦过太阳发生偏折——广义相对论第一次被天观测验证',
    detail: '广义相对论预言：光线经过太阳边缘会被引力场弯折 1.75 角秒。1919 年 5 月 29 日的日全食，爱丁顿率队到西非普林西比岛、另一队到巴西索布拉尔，拍摄全食期间太阳周围的恒星位置，与夜晚同区域星图对比，测得偏折约 1.6–1.9 角秒，与广义相对论吻合而远超牛顿预言（0.87 角秒）。这一观测让爱因斯坦一夜成名，也是「实验室之外的判决性实验」的经典范例。',
  },
  {
    id: 'hubble-redshift', name: '哈勃红移观测', nameEn: "Hubble's Redshift Observation",
    year: '1929', era: 'relativity', theoryId: 'lcdm',
    figures: ['埃德温·哈勃', '米尔顿·赫马森'], icon: '🔴',
    summary: '星系都在远离我们，越远的跑得越快——宇宙在膨胀',
    detail: '哈勃利用威尔逊山 2.5 米望远镜测量星系距离，结合斯莱弗积累的星系光谱红移，发现二者成正比：距离越远，退行速度越快（v = H₀d），即「哈勃定律」。这是对大爆炸/膨胀宇宙预言的首次系统性观测确认——此前爱因斯坦为静态宇宙引入的宇宙学常数被他自嘲为「一生最大的错误」。哈勃红移成为宇宙学标准模型的基石。',
  },
  {
    id: 'wu-parity', name: '吴健雄宇称破缺实验', nameEn: "Wu's Parity Violation Experiment",
    year: '1957', era: 'standard-model', theoryId: 'electroweak',
    figures: ['吴健雄'], icon: '❄️',
    summary: '极低温下的钴-60：衰变电子「偏爱」一个方向，宇称不守恒',
    detail: '李政道与杨振宁提出弱相互作用可能不守恒宇称后，吴健雄用极低温强磁场把钴-60 原子核的自旋方向对齐，测量 β 衰变电子的发射方向。结果发现电子明显偏向与自旋相反的方向发射——镜像世界中这一过程不会发生，宇称在弱作用中确实破缺。这一「冷实验」震惊物理界，李杨当年即获诺奖；它也确立了弱作用手征性的实验事实，是电弱统一理论的实验基石之一。',
  },
  {
    id: 'electron-double-slit', name: '电子双缝干涉实验', nameEn: 'Electron Double-Slit Experiment',
    year: '1961', era: 'quantum', theoryId: 'quantum-mechanics',
    figures: ['克劳斯·约恩孙'], icon: '⚡',
    summary: '让电子一个一个穿过双缝，屏幕上依然出现干涉条纹',
    detail: '约恩孙让电子束穿过双缝，得到与光相同的干涉图样——电子的波动性再次确认。更令人惊奇的是：即使电子逐个发射（排除相互影响），干涉条纹依然累积出现，说明单个电子同时通过了两条缝、与自己干涉。这一实验把量子力学的「测量之前不可言说」之悖论推到极致，费曼称之为「唯一包含了量子力学全部奥秘的实验」。',
  },
  {
    id: 'hulse-taylor-pulsar', name: '赫尔斯-泰勒脉冲星计时', nameEn: 'Hulse-Taylor Pulsar Timing',
    year: '1974', era: 'relativity', theoryId: 'general-relativity',
    figures: ['拉塞尔·赫尔斯', '约瑟夫·泰勒'], icon: '🛰️',
    summary: '一对中子星绕转的周期在变短——引力波带走了轨道能量',
    detail: '赫尔斯与泰勒发现脉冲星 PSR 1913+16——一颗中子星与另一颗中子星互绕，其中一颗发出规则脉冲。持续观测显示双星轨道周期以每年约 75 微秒的速度缩短，与广义相对论预言的「引力辐射带走能量」精确吻合（偏差不足 0.1%）。这是引力波存在的第一个间接但极强的证据，两人获 1993 年诺奖；LIGO 的最终直接探测为其画上句号。',
  },
  {
    id: 'rubin-rotation-curve', name: '鲁宾星系旋转曲线观测', nameEn: "Rubin's Galaxy Rotation Curves",
    year: '1970s', era: 'frontier', theoryId: 'dark-matter-energy',
    figures: ['维拉·鲁宾'], icon: '🌀',
    summary: '星系外围的恒星转得和中心一样快——可见物质远远不够',
    detail: '鲁宾与福特精确测量大量旋涡星系不同半径处的恒星公转速度，发现旋转曲线在星系外围保持平坦而非按开普勒定律下降——按可见恒星质量计算，外围恒星早该被甩出去。唯一解释：星系中存在大量看不见的暗物质提供额外引力。这一观测让暗物质从理论猜想变为普遍存在的观测事实，也开启了当代宇宙学「只认识 5% 物质」的图景。',
  },
];
