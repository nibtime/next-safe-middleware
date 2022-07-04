## Package development

The repository has a [`gitpod.yml`](.gitpod.yml) and [GitPod](https://gitpod.io/) offers 50 hours/month for free for working on public repos. The easiest way to get started with development.

### Run an e2e app development server with local packages

Run in repo root:

```
yarn dev
```

It will rebuild and rebundle packages on changes and run `next dev` of the e2e test app in parallel.


### Serve an e2e app production build with local packages

Required to test and evaluate things around strict CSPs. Run in repo root:

```
yarn start
```

It will (re)build all packages in the repo that have changed and serve a production build of the e2e app with `next start` and local package builds.


### Deploy the e2e app with local packages to Vercel
So see the behavior of the package in a production environment, you can deploy the e2e app to Vercel.
It will always use the local packages built from the last commit you pushed/deployed.

First, [fork this repo](https://github.com/nibtime/next-safe-middleware/fork). Then click the deploy button and import your fork: 

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/project)

Afterwards, you need to customize commands in Vercel project settings to make it work with [Yarn 3 monorepo structure](#repository-structure).

#### In your Vercel project settings

Set `apps/e2e` as "Root Directory" and enable "Include source files outside of the Root Directory in the Build Step."

In "Build & Development Settings":

Set "Framework Preset" to `Next.js`

and override the following commands:

**Build Command:** 
```
cd ../.. && yarn build:e2e:vercel
```
**Install Command:** 
```
yarn install --immutable --immutable-cache
```

## Submit PRs
TODO

## Report bugs
TODO

## Suggest features and enhancements
TODO

## Ask questions
TODO

## Commit and code conventions
TODO + setup for ESLint, Prettier, husky and lint-staged will be provided at some point.

## Repository structure
TODO

## Attributions

Policy icon in [README](packages/next-safe-middleware/_README.md) created by [Kiranshastry - Flaticon](https://www.flaticon.com/free-icons/policy)
