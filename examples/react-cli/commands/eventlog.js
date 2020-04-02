import React, { useState, useEffect } from 'react';
import { Text, Box } from 'ink';
import Table from 'ink-table';
import IPFS from 'ipfs';
import OrbitDB from 'orbit-db';

const initIPFSInstance = async () => {
  return await IPFS.create({ repo: './path-for-js-ipfs-repo' });
};

// Users command
const Users = () => {
  const creatures = ['🐙', '🐷', '🐬', '🐞', '🐈', '🙉', '🐸', '🐓'];
  const [users, setUsers] = useState([]);


  useEffect(() => {
    initIPFSInstance().then(async (ipfs) => {
      const orbitdb = await OrbitDB.createInstance(ipfs);

      // Create / Open a database
      const db = await orbitdb.log('hello');
      await db.load();

      // Listen for updates from peers
      db.events.on('replicated', (address) => {
        // console.log(db.iterator({ limit: -1 }).collect());
      });

      const query = async () => {
        const index = Math.floor(Math.random() * creatures.length);
        const userId = Math.floor(Math.random() * 900 + 100);

        try {
          await db.add({ avatar: creatures[index], userId: userId });
          setUsers(db.iterator({ limit: 5 }).collect());
        } catch (e) {
          console.error(e);
          process.exit(1);
        }
      };

      setInterval(query, 1000);
    });
  }, []);

  if (users.length === 0) {
    return (
      <Text>Loading...</Text>
    );
  }

  return (
    <Box>
      <Box marginRight={1}>
        <Table data={users.reverse().map((e) => e.payload.value) }/>
      </Box>
    </Box>
  );
};

export default Users;
