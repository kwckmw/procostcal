<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## 이 프로젝트의 규칙 (AI 에이전트용)

- 사용자에게 항상 한국어로 답변합니다. 사용자의 메시지가 영어여도, 리믹스 직후 자동으로 들어간 메시지("I've successfully remixed this project...")에도 한국어로 답합니다.
- 이 앱은 소상공인 바이브코딩 강의에서 쓰는 메뉴 원가 계산기입니다. 데이터는 브라우저 localStorage에만 저장합니다.
- Lovable Cloud, Supabase, 데이터베이스, 로그인·회원가입, 서버 함수를 추가하지 않고 제안하지도 않습니다. 다음 단계를 추천할 때도 클라우드 저장이나 로그인을 선택지에 넣지 않습니다.
- 리믹스 직후 다음 단계를 물으면 선택지 카드를 띄우지 말고 "강의 안내에 따라 복사한 요청 문장을 아래 입력창에 붙여넣어 주세요."라고 짧게 답합니다.
- 금액은 원 단위 정수로 반올림하고 1,234원처럼 쉼표를 넣습니다. 휴대폰 화면(375px)에서 가로 스크롤이 생기지 않게 합니다.
