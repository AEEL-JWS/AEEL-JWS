# AEEL 홈페이지 관리 방법

## 논문, 연구원, 연구 주제, 소식 관리

1. [Pages CMS 관리 화면](https://app.pagescms.org/aeel-jws/aeel-jws/main/collection/publications)에 접속해 GitHub 계정으로 로그인합니다.
2. 왼쪽에서 **Publications**(논문), **People**(연구원), **Research**(연구 주제), **News**(소식) 중 하나를 고릅니다.
3. 새 항목은 **Add an entry**, 기존 항목 수정은 **Edit**, 삭제는 항목 오른쪽의 **⋮ → Delete**를 누릅니다.
4. **Save**를 누르면 GitHub 저장소에 저장되고, GitHub Pages가 홈페이지를 다시 배포합니다. 반영에는 몇 분이 걸릴 수 있습니다.

다른 컴퓨터에서도 같은 주소로 접속할 수 있습니다. 편집자는 `AEEL-JWS/AEEL-JWS` 저장소에 대한 GitHub 쓰기 권한이 있어야 합니다. Pages CMS 앱은 이 저장소에만 접근하도록 설정했습니다. 업로드한 이미지는 저장소의 `public/images`에 들어갑니다.

## 현재 주소와 최종 도메인

- 임시 홈페이지: <https://aeel-jws.github.io/AEEL-JWS/>
- 최종 희망 주소: `AEEL.korea.ac.kr`

연구실에서 새 사이트의 내용과 디자인을 검수한 뒤 학교 담당자가 `AEEL.korea.ac.kr`의 DNS를 설정해야 합니다. 그때 GitHub Pages의 사용자 지정 도메인과 Astro 배포 주소를 함께 변경합니다. 현재 사용 중인 `shimgrp.korea.ac.kr`은 변경하지 않았습니다.

초기 내용은 [기존 AEEL 홈페이지](https://shimgrp.korea.ac.kr/)에서 확인한 자료를 바탕으로 작성한 초안입니다. 명단과 논문 정보 등을 연구실에서 검수해 주세요. 확인에 사용한 링크는 [`CONTENT_SOURCES.md`](../CONTENT_SOURCES.md)에 모았습니다.

## 개발자를 위한 로컬 실행

```sh
pnpm install
pnpm dev
pnpm build
```

최종 도메인 연결 시 빌드 환경에 `SITE_URL=https://AEEL.korea.ac.kr`, `BASE_PATH=/`를 설정하고, `public/CNAME`에 `AEEL.korea.ac.kr`을 넣습니다.
