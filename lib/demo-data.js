const demoTitles = [
  "[중국 현지취재 - 칭다오②] 무인 택배차량, 짐 실으니 26분 만에 '배송 완료'",
  "문자의 역사를 파고들수록 한글, 세계에서 가장 쉽고 편하다는 거 절감",
  "경주 최씨가 대림동 최씨가 되는 '이상한 나라'",
  "의심이 확신으로... 6.3 지방선거에서 가장 이례적인 부분",
  "'당대표 선호투표' 놓고 친청계 반발... 민주당 \"당내 이견, 오후 재논의\"",
  "'유일한 40대·여성' 고민정 \"가시밭길, 그럼에도 당대표 출마한 이유는\"",
  "반도체 호남 메가프로젝트에 나경원 \"TK 역차별\" 주장",
  "독일 유학파 베테랑 연주자의 월급명세서...말문이 막힌다",
  "[오마이포토] 참외 1kg 800원, 양파 1kg 650원... 7·7 전국농민대회",
  "[오마이포토] \"홈플러스 남은 시간 10여 일... 대통령 나서달라\"",
  "'이재명 쪼개기 후원' 김성태는 유죄·이화영은 무죄...판결 왜 갈렸나",
  "'술은 없었다'와 '모르겠다' 사이... 이화영 항소심이 다시 따져야 할 핵심 질문"
];

export function getDemoMainArticles() {
  return demoTitles.map((title, index) => {
    const cntnCd = `A0003248${String(407 + index).padStart(3, "0")}`;
    return {
      id: `main-${cntnCd}`,
      cntnCd,
      crc32: cntnCd,
      title,
      url: `https://m.ohmynews.com/NWS_Web/Mobile/at_pg.aspx?CNTN_CD=${cntnCd}`,
      naverUrl: "",
      position: index + 1,
      placement: "main",
      blockType: index === 0 ? "top" : index < 8 ? "main-list" : "secondary"
    };
  });
}

export function getDemoRankings(mainArticles) {
  const windows = [
    { windowKey: "20260709-18", label: "0709 17-18시" },
    { windowKey: "20260709-19", label: "0709 18-19시" },
    { windowKey: "20260709-20", label: "0709 19-20시" }
  ];

  const rankingArticles = [
    ...mainArticles.slice(0, 10),
    {
      crc32: "A0003249991",
      title: "메인 밖 후보: 네이버에서 급상승 중인 정치 기사",
      url: "",
      naverUrl: "https://news.naver.com/"
    },
    {
      crc32: "A0003249992",
      title: "메인 밖 후보: 조회가 붙기 시작한 생활 기사",
      url: "",
      naverUrl: "https://news.naver.com/"
    }
  ];

  return windows.map((rankingWindow, windowIndex) => ({
    ...rankingWindow,
    date: "20260709",
    hour: 18 + windowIndex,
    items: rankingArticles.map((article, index) => {
      const base = 6200 - index * 310;
      const slope = index % 4 === 0 ? 820 : index % 4 === 1 ? -360 : index % 4 === 2 ? 160 : 40;
      const externalBoost = article.crc32?.endsWith("9991") ? 2200 : article.crc32?.endsWith("9992") ? 900 : 0;
      return {
        crc32: article.crc32,
        articleId: article.cntnCd || article.crc32,
        title: article.title,
        rank: index + 1 + (windowIndex === 0 && index % 5 === 0 ? 3 : 0),
        count: Math.max(120, base + slope * windowIndex + externalBoost * windowIndex),
        linkUrl: article.naverUrl || "https://news.naver.com/",
        thumbnail: ""
      };
    })
  }));
}
