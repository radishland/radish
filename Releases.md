### 2025.06.20

#### @radish/core 1.0.0-alpha.45 (prerelease)

- BREAKING(core): rename `io` to `fs`
- BREAKING(core): rename `handleRequest` and `handleRoute` to `onRequest` (#141)
- BREAKING(core): simplify manifest/set operation (#135)
- feat(core): packaging plugin (#149)
- feat(core): add a fs/walk effect (#145)
- feat(core): adds `fs` effects (#144)
- perf(core): reuse pre-rendered templates for depended-upon elements (#140)
- perf(core): only override manifest/load once (#139)
- refactor(core): rewrite isParent without resolving paths (#147)
- refactor(core): updateManifest takes a glob (#146)

#### @radish/effect-system 0.5.0 (minor)

- BREAKING(effect-system): recursive and suspended handlers (#134)
- feat(effect-system): one-shot handlers (#138)

#### @radish/htmlcrunch 1.2.1 (patch)

- chore(htmlcrunch): update dependencies (#142)

#### @radish/init 1.0.0-alpha.32 (prerelease)

- fix(init): remove the manifest from the templates (#136)
- chore(init): rename `io` to `fs`

#### @radish/runtime 0.5.0 (minor)

- BREAKING(runtime): the use directive takes a key (#148)
- refactor(runtime): revert slow-types (#150)
- chore(runtime): update dependencies (#137)

### 2025.06.11

#### @radish/init 1.0.0-alpha.31 (prerelease)

- fix(init): update base manifest (#132)

### 2025.06.10

#### @radish/core 1.0.0-alpha.44 (prerelease)

- BREAKING(core): replace manifest/setLoader by manifest/set
- BREAKING(core): manifest/update returns void
- chore(core): use Terminal suffix for terminal handlers

#### @radish/init 1.0.0-alpha.30 (prerelease)

- fix(init): update template imports
- chore(init): update template

#### @radish/runtime 0.4.2 (patch)

- fix(runtime): hydrates siblings
- fix(runtime): hydration crosses shadowroots

### 2025.06.08

#### @radish/init 1.0.0-alpha.29 (prerelease)

- fix(init): prevent url path rewrite (#127)

### 2025.06.07

#### @radish/core 1.0.0-alpha.43 (prerelease)

- fix(core): unchecked bindings (#124)

#### @radish/runtime 0.4.1 (patch)

- feat(runtime): add `r-switch` element (#123)
- feat(runtime): add a fallback slot to `r-show` (#122)
- feat(runtime): add structural `r-show` element (#121)

### 2025.06.05

#### @radish/core 1.0.0-alpha.42 (prerelease)

- chore(core): remove boot script

#### @radish/init 1.0.0-alpha.28 (prerelease)

- chore(init): remove boot script

#### @radish/runtime 0.4.0 (minor)

- BREAKING(runtime): remove the boot script

### 2025.05.30

#### @radish/init 1.0.0-alpha.27 (prerelease)

- fix(init): jsr paths (#114)

### 2025.05.30

#### @radish/init 1.0.0-alpha.26 (prerelease)

- fix(init): jsr metaURL path (#112)

### 2025.05.30

#### @radish/core 1.0.0-alpha.41 (prerelease)

- BREAKING(core): pass plugins directly to the root scope
- feat(core): export conventions (#106)
- feat(core): expose the effect-system
- feat(core): pass a mutable `Headers` object in `RouteContext`
- fix(core): prevent leak by removing signalListener in the server cleanup
- fix(core): conditionally close ws
- fix(core): close hmr only if there is a watcher
- fix(core): graceful shutdown
- chore(core): add `indent` text helper (#105)

#### @radish/effect-system 0.4.0 (minor)

- BREAKING(effect-system): expose addHandler remove addHandlers
- BREAKING(effect-system): make `addHandlers` variadic (#102)
- feat(effect-system): Plugin API (#103)
- fix(effect-system): dispose and asyncDispose are lexically bound

#### @radish/init 1.0.0-alpha.25 (prerelease)

- feat(init): scaffold from github with authenticated requests (#108)
- feat(init): add github & local init methods (#107)
- fix(init): update the start script
- fix(init): add empty env.ts module (#100)

### 2025.05.23

#### @radish/core 1.0.0-alpha.40 (prerelease)

- BREAKING(core): rename and move `io` ops (#88)
- BREAKING(core): router & server effects (#86)
- BREAKING(core): ws and hmr effects (#85)
- feat(core): the io/read handler can read local or remote files (#96)
- feat(core): add `onDispose` cleanup hook (#84)
- test(core): add rendering tests (#92)
- chore(core): update preview importmap (#97)
- chore(core): flatten folder structure (#93)
- chore(core): update build/transform signature (#90)

#### @radish/effect-system 0.3.0 (minor)

- BREAKING(effect-system): remove `EffectWithId` symbol (#91)

#### @radish/init 1.0.0-alpha.24 (prerelease)

- chore(init): update templates (#95)

### 2025.05.16

#### @radish/effect-system 0.2.1 (patch)

- chore(effect-system): export createState (#82)

### 2025.05.16

#### @radish/core 1.0.0-alpha.39 (prerelease)

- BREAKING(core): extract the effect system (#76)
- chore(core): fix more imports (#74)
- chore(core): fix rel import from @radish/runtime #73
- chore(core): fix htmlcrunch rel import (#72)

#### @radish/effect-system 0.1.0 (breaking)

- BREAKING(effect-system): Snapshots, AsyncState and disposable HandlerScopes
  (#80)
- BREAKING(effect-system): disposable HandlerScope (#79)
- chore(effect-system): add tests (#77)

#### @radish/runtime 0.3.1 (patch)

- chore(runtime): update package.json #75

### 2025.05.08

#### @radish/core 1.0.0-alpha.38 (prerelease)

- BREAKING(core): render effect (#65)
- chore(core): update preview importmap (#70)

#### @radish/htmlcrunch 1.2.0 (minor)

- feat(htmlcrunch): node guard helpers
- fix(htmlcrunch): fix attributes casing (#69)

#### @radish/init 1.0.0-alpha.23 (prerelease)

- chore(init): update init plugins (#67)

#### @radish/runtime 0.3.0 (minor)

- BREAKING(runtime): unprefixed directives (#68)

### 2025.04.30

#### @radish/core 1.0.0-alpha.37 (prerelease)

- feat(core): env effect (#55)
- fix(core): slow types (#59)
- chore(core): handle importmap insertion in the importmap plugin (#62)

#### @radish/htmlcrunch 1.1.2 (patch)

- fix(htmlcrunch): improve the parsing of custom element names (#58)

#### @radish/init 1.0.0-alpha.22 (prerelease)

- fix(init): update template script (#63)
- chore(init): update template (#57)

### 2025.04.25

#### @radish/core 1.0.0-alpha.36 (prerelease)

- BREAKING(core): effect system (#41)
- feat(core): support jsr modules on the client (#38)
- chore(core): update preview importmap (#43)
- chore(core): stricter types (#40)
- chore(core): use asserts to explicit assumptions (#39)

#### @radish/init 1.0.0-alpha.21 (prerelease)

- chore(init): update template (#44)
- chore(init): update templates (#42)

### 2025.03.26

#### @radish/init 1.0.0-alpha.20 (prerelease)

- refactor(init): idiomatic template fetching (#35)
