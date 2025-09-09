Extend with JavaScript - Rendering templates

Rendering templates

*   [Overview](#overview)
*   [Example HTML page with layout](#example-html-page-with-layout)

### [Overview](#overview)

A common task when creating custom routes or emails is the need of generating HTML output. To assist with this, PocketBase provides the global `$template` helper for parsing and rendering HTML templates.

const html = $template.loadFiles(
    \`${\_\_hooks}/views/base.html\`,
    \`${\_\_hooks}/views/partial1.html\`,
    \`${\_\_hooks}/views/partial2.html\`,
).render(data)

The general flow when working with composed and nested templates is that you create "base" template(s) that defines various placeholders using the `{{template "placeholderName" .}}` or `{{block "placeholderName" .}}default...{{end}}` actions.

Then in the partials, you define the content for those placeholders using the `{{define "placeholderName"}}custom...{{end}}` action.

The dot object (`.`) in the above represents the data passed to the templates via the `render(data)` method.

By default the templates apply contextual (HTML, JS, CSS, URI) auto escaping so the generated template content should be injection-safe. To render raw/verbatim trusted content in the templates you can use the builtin `raw` function (e.g. `{{.content|raw}}`).

For more information about the template syntax please refer to the [_html/template_](https://pkg.go.dev/html/template#hdr-A_fuller_picture) and [_text/template_](https://pkg.go.dev/text/template) package godocs. **Another great resource is also the Hashicorp's [Learn Go Template Syntax](https://developer.hashicorp.com/nomad/tutorials/templates/go-template-syntax) tutorial.**

### [Example HTML page with layout](#example-html-page-with-layout)

Consider the following app directory structure:

myapp/
    pb\_hooks/
        views/
            layout.html
            hello.html
        main.pb.js
    pocketbase

We define the content for `layout.html` as:

<!DOCTYPE html>
<html lang="en">
<head>
    <title>{{block "title" .}}Default app title{{end}}</title>
</head>
<body>
    Header...

    {{block "body" .}}
        Default app body...
    {{end}}

    Footer...
</body>
</html>

We define the content for `hello.html` as:

{{define "title"}}
    Page 1
{{end}}

{{define "body"}}
    <p>Hello from {{.name}}</p>
{{end}}

Then to output the final page, we'll register a custom `/hello/:name` route:

routerAdd("get", "/hello/{name}", (e) => {
    const name = e.request.pathValue("name")

    const html = $template.loadFiles(
        \`${\_\_hooks}/views/layout.html\`,
        \`${\_\_hooks}/views/hello.html\`,
    ).render({
        "name": name,
    })

    return e.html(200, html)
})

* * *

[Prev: Sending emails](/docs/js-sending-emails) [Next: Console commands](/docs/js-console-commands)