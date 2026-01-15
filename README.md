# NotebookLM Sync

Obsidian 영구 노트를 Google NotebookLM 노트북 소스로 동기화하는 플러그인입니다.

## Features

- **노트북 동기화**: 선택한 노트들을 NotebookLM 노트북 소스로 전송
- **일괄 동기화**: 폴더 단위로 여러 노트를 한 번에 동기화
- **선택적 동기화**: 개별 노트 선택하여 동기화
- **동기화 상태 추적**: 어떤 노트가 동기화되었는지 확인

## PKM Workflow

```
영구 노트 (Zettelkasten) → NotebookLM Sync → NotebookLM 노트북 소스
                              (활용 Utilize)
```

이 플러그인을 통해 PKM 시스템에서 축적한 지식을 Google NotebookLM의 RAG 기능으로 활용할 수 있습니다.

## Requirements

- **Desktop Only**: 이 플러그인은 데스크톱 환경에서만 작동합니다 (모바일 미지원)
- **Google Account**: NotebookLM 사용을 위한 Google 계정
- **NotebookLM Access**: Google NotebookLM 서비스 접근 권한

## Installation

### BRAT (권장)

1. [BRAT](https://github.com/TfTHacker/obsidian42-brat) 플러그인 설치
2. BRAT 설정 열기
3. "Add Beta plugin" 클릭
4. 입력: `eohjun/obsidian-notebooklm-sync`
5. 플러그인 활성화

### Manual

1. 최신 릴리스에서 `main.js`, `manifest.json` 다운로드
2. 폴더 생성: `<vault>/.obsidian/plugins/notebooklm-sync/`
3. 다운로드한 파일을 폴더에 복사
4. Obsidian 설정에서 플러그인 활성화

## Setup

### Google 인증 설정

1. Settings → NotebookLM Sync 열기
2. Google 계정으로 인증
3. 동기화할 NotebookLM 노트북 선택

## Commands

| 명령어 | 설명 |
|--------|------|
| **Sync current note** | 현재 노트를 NotebookLM에 동기화 |
| **Sync selected notes** | 선택한 노트들을 동기화 |
| **Sync folder** | 폴더 전체를 동기화 |
| **View sync status** | 동기화 상태 확인 |

## Usage Workflow

```
1. Google 계정 인증 완료
2. 동기화할 노트 또는 폴더 선택
3. 동기화 명령 실행
4. NotebookLM에서 동기화된 소스 확인
5. NotebookLM의 AI 기능으로 지식 활용
```

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Target Notebook | 동기화 대상 노트북 | - |
| Auto-sync | 노트 수정 시 자동 동기화 | false |
| Sync folder | 기본 동기화 폴더 | `04_Zettelkasten` |
| Include frontmatter | 프론트매터 포함 여부 | false |

## Use Cases

### PKM → RAG 활용

1. **지식 검색**: NotebookLM에서 자연어로 자신의 노트 검색
2. **요약 생성**: 여러 노트를 바탕으로 종합 요약 생성
3. **질문 응답**: 축적된 지식 기반으로 Q&A
4. **오디오 생성**: 노트 내용을 팟캐스트 스타일 오디오로 변환

## Related Plugins

이 플러그인은 다음 플러그인들과 잘 연계됩니다:

- **[Evergreen Note Cultivator](https://github.com/eohjun/obsidian-evergreen-note-cultivator)**: 품질 높은 노트만 동기화
- **[Knowledge Synthesizer](https://github.com/eohjun/obsidian-knowledge-synthesizer)**: 합성된 노트를 NotebookLM에서 활용

## Development

```bash
# Install dependencies
npm install

# Development with watch mode
npm run dev

# Production build
npm run build
```

## License

MIT
