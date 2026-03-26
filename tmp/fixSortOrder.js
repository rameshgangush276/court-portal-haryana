const fs = require('fs');

function fixTableSortOrders(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Regex to match the block starting from 'name: "XY. text"' to 'sortOrder: Z,'
    // and grab the number 'XY' to replace 'Z' with 'XY'.
    const re = /name:\s*['"](\d+)\..*?['"],[\s\S]*?singleRow:\s*(?:true|false),[\s]*sortOrder:\s*(\d+)/g;
    
    // Test the regex logic to ensure it's hitting the table name, not the column name!
    // Since table names inherently start with digits (1., 2., 12.) and columns do not!
    let newContent = content.replace(re, (match, tableNumber, oldSortOrder) => {
        // match: the full string from 'name:' to 'sortOrder: X'
        // we need to replace the last occurrence of 'sortOrder: <oldSortOrder>' with 'sortOrder: <tableNumber>'
        const lastIndex = match.lastIndexOf('sortOrder:');
        return match.substring(0, lastIndex) + 'sortOrder: ' + tableNumber;
    });

    fs.writeFileSync(filePath, newContent);
    console.log(`Fixed sortOrders safely in ${filePath}`);
}

fixTableSortOrders('prisma/seed.js');
fixTableSortOrders('prisma/seed-production.js');
fixTableSortOrders('server/routes/system.js');
