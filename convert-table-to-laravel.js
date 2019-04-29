var jq = document.createElement('script');
jq.src = "https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js";
document.getElementsByTagName('head')[0].appendChild(jq);
jQuery.noConflict();

let rows = [];
let laravelTable = [];
let hasIncrement = false;
let formatDeclareType = '$table->';
let convertMap = {
    increments:'increments',
    bigincrements:'bigIncrements',
    int:'integer',
    varchar:'string',
    tinyint:'tinyInteger',
    bigint:'bigInteger',
    datetime:'dateTime',
    text:'text',
    decimal:'decimal',
    bool:'boolean',
    timestamp: 'timestamp',
    blob:'binary',

};


$('table').find('tbody tr').each(function (i, el) {
    var $tds = $(this).find('td'),
        colName = $tds.eq(0).text().trim(),
        type = $tds.eq(2).text().trim().replace(/\)/g, '').split('('),
        length = $tds.eq(3).text().trim(),
        pk = $tds.eq(4).text().trim(),
        uk = $tds.eq(5).text().trim(),
        notNull = $tds.eq(6).text().trim(),
        defaultVal	 = $tds.eq(7).text().trim(),
        constraint = $tds.eq(8).text().trim(),
        comment = $tds.eq(9).text().trim();

    rows.push({colName, type, length, pk, uk, notNull, defaultVal, constraint, comment});
});

function checkSoftDelete(rows) {
    let isSoftDelete = false;
    rows.forEach(function (row) {
        if (row.colName == 'deleted_at') {
            isSoftDelete = true;
        }
    })
    if (isSoftDelete)  return formatDeclareType + 'softDeletes()';
}

function checkCreateUpdate(rows) {
    let rs = [];
    rows.forEach(function (row) {
        if (row.colName == 'created_at') {
            rs.push(formatDeclareType + "timestamp('created_at')->default(\\Illuminate\\Support\\Facades\\DB::raw('CURRENT_TIMESTAMP'))");
        }

        if (row.colName == 'updated_at') {
            rs.push(formatDeclareType + "timestamp('update_at')");
        }
    })
    if (rs.length > 1) {
        return formatDeclareType + "timestamp()";
    } else {
        return  rs[0];
    }
}

function checkIncrement(row) {
    row.type[0] = row.type[0].trim();
    if (row.constraint.indexOf('auto') != -1) {
        if (row.type[0] == 'int') {
            row.type[0] = "increments";
        } else if (row.type[0] == 'bigint'){
            row.type[0] = "bigincrements";
        }

        hasIncrement = true;
    }
    return row;
}

function checkPrimaryKeys(rows) {
    let pkKeys = [];
    rows.forEach(function (row) {
        if (row.pk != '') {
            pkKeys.push("'" + row.colName + "'");
        }
    })
    if (pkKeys.length > 0) {
        return formatDeclareType + "primary([" + pkKeys.join(',') + "])";
    }
}

function checkExistence(rows) {
    let isExistence = false;
    rows.forEach(function (row) {
        if (row.colName == 'existence') {
            isExistence = true;
        }
    })
    if (isExistence) return formatDeclareType + "boolean('existence')->nullable()->storedAs('CASE WHEN deleted_at IS NULL THEN 1 ELSE NULL END')";
}

function checkCompositeExistence(rows) {
    let usKeys = [];
    rows.forEach(function (row) {
        if (row.uk.indexOf('existence') != -1) {
            usKeys.push("'" + row.colName + "'");
        }
    })
    if (usKeys.length > 0) {
        return formatDeclareType + "unique([" + usKeys.join(',') + ", 'existence'])";
    }
}

function registerDataType(rows) {

    let createCol = '';
    rows.forEach(function (row) {

        row = checkIncrement(row);

        if (row.colName.trim() == 'created_at'
            || row.colName.trim() == 'updated_at'
            || row.colName.trim() == 'deleted_at'
            || row.colName.trim() == 'existence') return;

        let additionType = '';

        if (row.type.length > 1) {
            if(row.type[1] != 'unsigned') {
                additionType = "," + row.type[1];
            }
        } else {
            additionType = row.length == '' ? '' : ', ' + row.length;
        }

        createCol = formatDeclareType + convertMap[row.type[0].trim().toLocaleLowerCase()] + "('" + row.colName + "'" + additionType + ")";

        if (row.type.length > 1) {
            if(row.type[1].trim() == 'unsigned') {
                createCol += "->unsigned()";
            }
        }

        if (row.notNull == '') {
            createCol += "->nullable()";
        }

        if (row.defaultVal != '') {
            createCol += "->default('" + row.defaultVal + "')";
        }

        if (row.comment != '') {
            createCol += "->comment('" + row.comment + "')";
        }

        laravelTable.push(createCol);
    })

}

function convertToLaravel(rows) {

    registerDataType(rows);
    laravelTable.push(checkCreateUpdate(rows));
    laravelTable.push(checkSoftDelete(rows));
    laravelTable.push(checkExistence(rows));
    laravelTable.push(checkCompositeExistence(rows));
    if (!hasIncrement) {
        laravelTable.push(checkPrimaryKeys(rows));
    }

    let rs = [];
    laravelTable.forEach(function (item) {
        if (typeof item !== 'undefined') {
            rs.push(item)
        }
    })
    console.log(rs.join(';\n'))
}

convertToLaravel(rows);