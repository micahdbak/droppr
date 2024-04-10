# Embeds

To simplify the droppr structure, the dropper and recipient interfaces should
exist as embeddable HTML pages, requiring no React or other UI frameworks.

Within a React website implementing droppr, for example, you could:

```html
<iframe src="https://embed.droppr.net" title="dropper"></iframe>
```

Or:

```html
<iframe src="https://embed.droppr.me" title="recipient"></iframe>
```
