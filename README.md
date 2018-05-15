# [Carbon Wiki]
This is a demo application. Deploying the build of this into a GCS bucket allows
users to start contributing to building that website into a wiki.

The app uses [Carbon Editor](https://github.com/carbon-tools/carbon) and Services (like [Carbon UpUp](https://github.com/carbon-tools/upup)) to
allow editors to upload photos and edit pages.

## Examples:
* [DocsApp](https://docsapp.carbon.tools/)
* [SillyWiki](https://sillywiki.carbon.tools/)


Once you deploy this make sure to configure your GCS bucket to serve index.html as the 404 error so people
can create new pages.


Note: This repo started with the Skeleton [Web Starter Kit](https://github.com/google/web-starter-kit/releases/latest)
