# AEEL 홈페이지 관리 방법

[Pages CMS 관리 화면](https://app.pagescms.org/aeel-jws/aeel-jws/main)에 GitHub 계정으로 로그인합니다. 다른 컴퓨터에서도 같은 주소를 사용할 수 있습니다. 편집자는 `AEEL-JWS/AEEL-JWS` 저장소에 대한 쓰기 권한이 있어야 합니다.

왼쪽 메뉴는 홈페이지와 비슷하게 구성했습니다.

- **Research**: 연구 주제
- **Members → Professor**: 심재원 교수님 사진, 연락처, 학력·경력·수상·활동
- **Members → Researchers / Alumni**: 구성원과 졸업생
- **Publications → Papers / Patents / Conferences**: 연구 성과
- **Board → Notices / News / Gallery**: 공지, 소식, 사진 앨범
- **Contact & Recruitment**: 위치, 연락처, 지원 안내

목록형 메뉴에서는 **Add**로 새 항목을 만들고, 항목을 열어 **Edit**하거나 메뉴에서 **Delete**할 수 있습니다. 제목 등 필수 항목을 입력한 뒤 **Save**를 누르세요. 저장 내용은 GitHub에 반영되고 GitHub Pages가 자동 배포합니다. 배포에는 몇 분이 걸릴 수 있습니다.

Professor와 Contact는 하나의 파일을 편집하는 메뉴입니다. Professor의 Education / Professional Experience / Honors & Awards / Activities에서 **Add item**을 눌러 반복 항목을 추가할 수 있습니다. **Display order** 숫자가 작은 항목이 먼저 표시됩니다. Professor 사진은 **Profile image** 필드에서 바꿀 수 있습니다.

Gallery에서 **Add**로 앨범을 만든 후 **Photos · Add image**를 반복해 사진과 캡션을 추가합니다. Cover image를 지정하지 않으면 첫 번째 사진이 표지로 사용됩니다. 업로드한 이미지와 공지 첨부 파일은 저장소의 `public/images`에 저장됩니다.

Researchers에서 졸업생을 Alumni로 옮길 때는 Alumni에 정보를 새로 등록하고 확인한 다음 기존 Researchers 항목을 삭제하세요. Pages CMS는 두 컬렉션 사이의 자동 이동 기능은 제공하지 않습니다.

현재 임시 주소는 <https://aeel-jws.github.io/AEEL-JWS/>입니다. 최종 희망 주소 `AEEL.korea.ac.kr`은 새 사이트 검수 후 학교 DNS와 GitHub Pages 설정을 함께 변경해야 합니다. 기존 `shimgrp.korea.ac.kr`은 변경하지 않았습니다.

초기 콘텐츠 출처는 [CONTENT_SOURCES.md](../CONTENT_SOURCES.md)에 정리했습니다. 신규 메뉴 중 기존 자료가 확인되지 않은 카테고리는 빈 상태로 두었습니다.

## 개발자를 위한 로컬 실행

```sh
pnpm install
pnpm dev
pnpm check
pnpm build
```

최종 도메인 연결 시 빌드 환경에 `SITE_URL=https://AEEL.korea.ac.kr`, `BASE_PATH=/`를 설정하고, `public/CNAME`에 `AEEL.korea.ac.kr`을 넣습니다.
