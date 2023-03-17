const goMake = go.GraphObject.make;

// Fetch tables and relationships, then visualize them using GoJS
fetch('/api/tables')
  .then(response => response.json())
  .then(tables => {
    fetch('/api/relationships')
      .then(response => response.json())
      .then(relationships => {
        // Visualize tables and relationships using GoJS
        const $ = goMake;
        const diagram = $(go.Diagram, 'visualization', { 'undoManager.isEnabled': true });

        diagram.nodeTemplate =
          $(go.Node, 'Auto',
            $(go.Shape, 'Rectangle', { strokeWidth: 1, fill: 'white' }),
            $(go.Panel, 'Vertical',
              $(go.TextBlock, { margin: new go.Margin(8, 8, 0, 8), stroke: "blue" }, // Change the font color to blue
                new go.Binding('text', '', data => `📋 ${data.key}`)),
              $(go.Panel, 'Table',
                new go.Binding('itemArray', 'columns'),
                {
                  rowSizing: go.RowColumnDefinition.None,
                  defaultAlignment: go.Spot.Left,
                  stretch: go.GraphObject.Horizontal,
                  itemTemplate:
                    $(go.Panel, 'TableRow',
                      $(go.TextBlock, { margin: new go.Margin(0, 8, 8, 8) },
                        new go.Binding('text', '', data => `🔹 ${data.text}`))
                    )
                }
              )
            )
          );

        const model = new go.GraphLinksModel();

        for (const tableName in tables) {
          model.addNodeData({ key: tableName, columns: tables[tableName].map(column => ({ text: column })) });
          for (const columnName in relationships[tableName].foreignKeys) {
            const referencedTable = relationships[tableName].foreignKeys[columnName].referencedTable;
            model.addLinkData({ from: tableName, to: referencedTable });
          }
        }

        diagram.model = model;
      });
  })
  .catch(error => {
    console.error('Error fetching tables and relationships:', error);
  });
