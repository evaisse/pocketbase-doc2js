Extend with JavaScript - Logging

Logging

`$app.logger()` could be used to writes any logs into the database so that they can be later explored from the PocketBase _Dashboard > Logs_ section.

For better performance and to minimize blocking on hot paths, logs are written with debounce and on batches:

*   3 seconds after the last debounced log write
*   when the batch threshold is reached (currently 200)
*   right before app termination to attempt saving everything from the existing logs queue

*   [Logger methods](#js-logging-logger-methods)
    *   [debug(message, attrs...)](#js-logging-debugmessage-attrs-)
    *   [info(message, attrs...)](#js-logging-infomessage-attrs-)
    *   [warn(message, attrs...)](#js-logging-warnmessage-attrs-)
    *   [error(message, attrs...)](#js-logging-errormessage-attrs-)
    *   [with(attrs...)](#js-logging-withattrs-)
    *   [withGroup(name)](#js-logging-withgroupname)
*   [Logs settings](#js-logging-logs-settings)
*   [Custom log queries](#js-logging-custom-log-queries)
*   [Intercepting logs write](#js-logging-intercepting-logs-write)

### [Logger methods](#js-logging-logger-methods)

All standard [`slog.Logger`](/jsvm/interfaces/slog.Logger.html) methods are available but below is a list with some of the most notable ones. Note that attributes are represented as key-value pair arguments.

##### [debug(message, attrs...)](#js-logging-debugmessage-attrs-)

    $app.logger().debug("Debug message!") $app.logger().debug( "Debug message with attributes!", "name", "John Doe", "id", 123, )

##### [info(message, attrs...)](#js-logging-infomessage-attrs-)

    $app.logger().info("Info message!") $app.logger().info( "Info message with attributes!", "name", "John Doe", "id", 123, )

##### [warn(message, attrs...)](#js-logging-warnmessage-attrs-)

    $app.logger().warn("Warning message!") $app.logger().warn( "Warning message with attributes!", "name", "John Doe", "id", 123, )

##### [error(message, attrs...)](#js-logging-errormessage-attrs-)

    $app.logger().error("Error message!") $app.logger().error( "Error message with attributes!", "id", 123, "error", err, )

##### [with(attrs...)](#js-logging-withattrs-)

`with(atrs...)` creates a new local logger that will "inject" the specified attributes with each following log.

    const l = $app.logger().with("total", 123) // results in log with data {"total": 123} l.info("message A") // results in log with data {"total": 123, "name": "john"} l.info("message B", "name", "john")

##### [withGroup(name)](#js-logging-withgroupname)

`withGroup(name)` creates a new local logger that wraps all logs attributes under the specified group name.

    const l = $app.logger().withGroup("sub") // results in log with data {"sub": { "total": 123 }} l.info("message A", "total", 123)

### [Logs settings](#js-logging-logs-settings)

You can control various log settings like logs retention period, minimal log level, request IP logging, etc. from the logs settings panel:

![Logs settings screenshot](/images/screenshots/logs.png)

### [Custom log queries](#js-logging-custom-log-queries)

The logs are usually meant to be filtered from the UI but if you want to programmatically retrieve and filter the stored logs you can make use of the [`$app.logQuery()`](/jsvm/functions/_app.logQuery.html) query builder method. For example:

    let logs = arrayOf(new DynamicModel({ id: "", created: "", message: "", level: 0, data: {}, })) // see https://pocketbase.io/docs/js-database/#query-builder $app.logQuery(). // target only debug and info logs andWhere($dbx.in("level", -4, 0)). // the data column is serialized json object and could be anything andWhere($dbx.exp("json_extract(data, '$.type') = 'request'")). orderBy("created DESC"). limit(100). all(logs)

### [Intercepting logs write](#js-logging-intercepting-logs-write)

If you want to modify the log data before persisting in the database or to forward it to an external system, then you can listen for changes of the `_logs` table by attaching to the [base model hooks](./js-event-hooks.md). For example:

    onModelCreate((e) => { // print log model fields console.log(e.model.id) console.log(e.model.created) console.log(e.model.level) console.log(e.model.message) console.log(e.model.data) e.next() }, "_logs")

* * *

[Prev: Filesystem](./js-filesystem.md) [Next: Types reference](/jsvm/index.html)