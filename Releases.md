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
