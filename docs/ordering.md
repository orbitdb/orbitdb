# Odering in OrbitList

```
 A   B   C
        0.0
         |
0.0     0.1
 |       |
0.1     0.2
   \   /      <--- Sync B with A and C
    1.0   
     |    
    1.1   
   /          <--- Sync A with B
2.0       
   \      
     \        <--- Sync C with A
       \  
        3.0
              <--- Sync ALL
```

Initial state:
```
A = []
B = []
C = []
```

Two nodes add events concurrently:

Add items to A:
```
listA.add("mango")
listA.add("banana")
// "A": [
//   { "id": "A", "seq": 0, "ver": 0, "prev": null}
//   { "id": "A", "seq": 0, "ver": 1, "prev": ["A.0.0"]}
// ]
```

Add items to C:
```
listC.add("apple")
listC.add("strawberry")
listC.add("orange")
// "C": [
//   { "id": "C", "seq": 0, "ver": 0, "prev": null}
//   { "id": "C", "seq": 0, "ver": 1, "prev": ["C.0.0"]}
//   { "id": "C", "seq": 0, "ver": 2, "prev": ["C.0.1"]}
// ]
```

B receives a 'sync' from A and C:
```
Sync: B <--> A
Sync: B <--> C
```

Add items to B:
```
listB.add("pineapple")
listB.add("papaya")
// "B": [
//   { "id": "A", "seq": 0, "ver": 0, "prev": null}
//   { "id": "A", "seq": 0, "ver": 1, "prev": ["A.0.0"]}
//   { "id": "C", "seq": 0, "ver": 0, "prev": null}
//   { "id": "C", "seq": 0, "ver": 1, "prev": ["C.0.0"]}
//   { "id": "C", "seq": 0, "ver": 2, "prev": ["C.0.1"]}
//   { "id": "B", "seq": 1, "ver": 0, "prev": ["A.0.1", "C.0.2"]}
//   { "id": "B", "seq": 1, "ver": 1, "prev": ["B.1.0"]}
// ]
```

A receives a 'sync' from B:
```
Sync: A <--> B
```

```
listA.add("kiwi")
// "B": [
//   { "id": "A", "seq": 0, "ver": 0, "prev": null}
//   { "id": "A", "seq": 0, "ver": 1, "prev": ["A.0.0"]}
//   { "id": "C", "seq": 0, "ver": 0, "prev": null}
//   { "id": "C", "seq": 0, "ver": 1, "prev": ["C.0.0"]}
//   { "id": "C", "seq": 0, "ver": 2, "prev": ["C.0.1"]}
//   { "id": "B", "seq": 1, "ver": 0, "prev": ["A.0.1", "C.0.2"]}
//   { "id": "B", "seq": 1, "ver": 1, "prev": ["B.1.0"]}
//   { "id": "A", "seq": 2, "ver": 0, "prev": ["B.1.1"]}
// ]
```

C receives a 'sync' from A:
```
Sync: C <--> A
```

```
listC.add("blueberry")
// "C": [
//   { "id": "A", "seq": 0, "ver": 0, "prev": null}
//   { "id": "A", "seq": 0, "ver": 1, "prev": ["A.0.0"]}
//   { "id": "C", "seq": 0, "ver": 0, "prev": null}
//   { "id": "C", "seq": 0, "ver": 1, "prev": ["C.0.0"]}
//   { "id": "C", "seq": 0, "ver": 2, "prev": ["C.0.1"]}
//   { "id": "B", "seq": 1, "ver": 0, "prev": ["A.0.1", "C.0.2"]}
//   { "id": "B", "seq": 1, "ver": 1, "prev": ["B.1.0"]}
//   { "id": "A", "seq": 2, "ver": 0, "prev": ["B.1.1"]}
//   { "id": "C", "seq": 3, "ver": 0, "prev": ["A.2.0"]}
// ]
```

A receives a 'sync' from C, B receives a 'sync' from C:
```
Sync: A <--> C
Sync: B <--> C
```

Data set converged (after sync ALL):
```json
{ "id": "A", "seq": 0, "ver": 0, "prev": null},
{ "id": "A", "seq": 0, "ver": 1, "prev": ["A.0.0"]},
{ "id": "C", "seq": 0, "ver": 0, "prev": null},
{ "id": "C", "seq": 0, "ver": 1, "prev": ["C.0.0"]},
{ "id": "C", "seq": 0, "ver": 2, "prev": ["C.0.1"]},
{ "id": "B", "seq": 1, "ver": 0, "prev": ["A.0.1", "C.0.2"]},
{ "id": "B", "seq": 1, "ver": 1, "prev": ["B.1.0"]}
{ "id": "A", "seq": 2, "ver": 0, "prev": ["B.1.1"]}
{ "id": "C", "seq": 3, "ver": 0, "prev": ["A.2.0]"]}
```
