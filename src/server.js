const express = require('express');
const { connectToCollection, desconnect, generateId } = require('../connection_db.js');

const server = express();

const messageNotFound = JSON.stringify({ message: 'El código no corresponde a un mueble registrado' });
const messageMissingData = JSON.stringify({ message: 'Faltan datos relevantes' });
const messageErrorServer = JSON.stringify({ message: 'Se produjo un error en el server' });

// Middlewares
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

server.get('/api/v1/muebles', async (req, res) => {
    const { categoria,precio_gte,precio_lte} = req.query;
    let muebles = [];

    try {
        const collection = await connectToCollection('muebles');

        if (categoria) muebles = await collection.find({ categoria }).sort({ nombre: 1 }).toArray();
        else if (precio_gte) muebles = await collection.find({ precio: { $gte: Number(precio_gte) } }).sort({ precio: 1}).toArray();
        else if (precio_lte) muebles = await collection.find({ precio: { $lte: Number(precio_lte) } }).sort({ precio: -1}).toArray();
        else muebles = await collection.find().toArray();

        res.status(200).send(JSON.stringify({ payload: muebles }));
    } catch (error) {
        console.log(error.message);
        res.status(500).send(messageErrorServer);
    } finally {
        await desconnect();
    }
});

//Obtiene el registro de un mueble por su código.
server.get('/api/v1/muebles/:codigo', async (req, res) => {
    const { codigo } = req.params;

    try {
        const collection = await connectToCollection('muebles');
        const mueble = await collection.findOne({ codigo: Number(codigo) });

        if (!mueble) return res.status(400).send(messageNotFound);

        res.status(200).send(JSON.stringify({ payload: mueble }));
    } catch (error) {
        console.log(error.message);
        res.status(500).send(messageErrorServer);
    } finally {
        await desconnect();
    }
});

server.post('/api/v1/muebles', async (req, res) => {
    const { nombre, precio, categoria } = req.body;

    if (!nombre || !precio || !categoria) return res.status(400).send(messageMissingData);

    try {
        const collection = await connectToCollection('muebles');
        const mueble = { codigo: await generateId(collection), nombre, precio, categoria  };

        if (nombre) mueble.nombre = nombre;
        if (precio) mueble.precio = precio;
        if (categoria) mueble.categoria = categoria;

        await collection.insertOne(mueble);
        res.status(201).send(JSON.stringify({ message: 'Registro creado', payload: mueble }));
    } catch (error) {
        console.log(error.message);
        res.status(500).send(messageErrorServer);
    } finally {
        await desconnect();
    }
});

server.put('/api/v1/muebles/:codigo', async (req, res) => {
    const { codigo } = req.params;
    const { nombre, precio, categoria } = req.body;

    if (!codigo || !nombre || !precio || !categoria) return res.status(400).send(messageMissingData);

    try {
        const collection = await connectToCollection('muebles');
        let mueble = await collection.findOne({ codigo: { $eq: Number(codigo) } });

        if (!mueble) return res.status(400).send(messageNotFound);
        mueble = {codigo: Number(codigo), nombre, precio, categoria};

        if (nombre) mueble.nombre = nombre;
        if (precio) mueble.precio = precio;
        if (categoria) mueble.categoria = categoria;

        await collection.updateOne({ codigo: Number(codigo) }, { $set: mueble });
        res.status(200).send(JSON.stringify({ message: 'Registro actualizado', payload: { codigo, ...mueble } }));
    } catch (error) {
        console.log(error.message);
        res.status(500).send(messageErrorServer);
    } finally {
        await desconnect();
    }
});

server.delete('/api/v1/muebles/:codigo', async (req, res) => {
    const { codigo } = req.params;

    try {
        const collection = await connectToCollection('muebles');
        const mueble = await collection.findOne({ codigo: { $eq: Number(codigo) } });

        if (!mueble) return res.status(400).send(messageNotFound);

        await collection.deleteOne({ codigo: { $eq: Number(codigo) } });
        res.status(200).send(JSON.stringify({ message: 'Registro eliminado' }));
    } catch (error) {
        console.log(error.message);
        res.status(500).send(messageErrorServer);
    } finally {
        await desconnect();
    }
});

// Control de rutas inexistentes
server.use('*', (req, res) => {
    res.status(404).send(`<h1>Error 404</h1><h3>La URL indicada no existe en este servidor</h3>`);
});

// Método oyente de solicitudes
server.listen(process.env.SERVER_PORT, process.env.SERVER_HOST, () => {
    console.log(`Ejecutandose en http://${process.env.SERVER_HOST}:${process.env.SERVER_PORT}/api/v1/muebles`);
});
