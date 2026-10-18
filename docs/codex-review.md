# Hoja de la prueba de rigor del Códex

Esta hoja es para la **prueba de rigor** del GDD (§10): un compañero con buen nivel de DAA coteja el Códex con los textos de referencia, demostración por demostración y línea por línea. Es **opcional**: el plan 07 (fase 14) la deja preparada para quien quiera hacerla.

## Estado antes de la revisión

- Las demostraciones de **C1–C14** ya se revisaron línea a línea, contra los enunciados del propio Códex y los testigos del núcleo, en la revisión del hito G2 del plan 07, y se juzgaron correctas.
- Cada pestaña Formal termina con un comentario `<!-- rigor: … -->` que lista las casillas comprobadas de la lista de rigor (abajo). Todas las entradas marcan **1 2 3 4 6 7 8**.
- **La casilla 5 sigue abierta en las catorce entradas.** Los tres libros de referencia (LP, KV y T) no estuvieron disponibles al redactar ni al revisar el Códex. Por eso las líneas de `### Referencias` citan el capítulo (y en KV a veces la sección), pero **no** la edición cotejada ni el número de cada resultado, y ninguna demostración se ha comparado todavía con la del libro. Esta hoja es el sitio donde cerrarla.
- Lo que sí está comprobado por máquina: la estructura de cada demostración (numeración, `*Demostración.*` cerrada con $\blacksquare$, enlaces), que todas las fórmulas se renderizan, que cada testigo nombrado existe, y los propios testigos, que comprueban los enunciados en miles de grafos aleatorios contra la fuerza bruta (`npm test`).

## Cómo usar la hoja

1. Lee cada entrada en el juego, con `?teacher&codex=C8&tab=formal` en la dirección (abre el Códex entero en esa entrada y pestaña), o directamente en `src/content/es/codex/C08.md`.
2. Para cada resultado: localízalo en la referencia que se indica y anota la **edición**, la **sección** y el **número del resultado** en la línea «En la edición usada». Si la referencia no lo contiene, anótalo también.
3. Marca la casilla de cada paso de la demostración cuando lo hayas comprobado: que se sigue de lo anterior, que cita lo que usa (definición o resultado por su número) y que cubre los casos límite.
4. Escribe en «Notas» cualquier error, hueco o diferencia con el libro, aunque sea de notación. Una nota que pida un cambio en el texto se traslada a la entrada y a su línea de referencia.
5. Cuando una entrada quede cotejada entera, añade `5` a su comentario `<!-- rigor: … -->` y completa su línea de referencia con la edición, la sección y los números.

`tests/codexReview.test.ts` comprueba que esta hoja tiene una sección por cada resultado demostrado del Códex, en el orden del libro, cada una con al menos una casilla.

### Referencias abreviadas

- **LP**: L. Lovász y M. D. Plummer, _Matching Theory_, North-Holland, 1986 (reimpr. AMS Chelsea, 2009).
- **KV**: B. Korte y J. Vygen, _Combinatorial Optimization: Theory and Algorithms_, 6.ª ed., Springer, 2018; cap. 10, _Maximum Matchings_ (y cap. 11, _Weighted Matching_, en C14).
- **T**: R. E. Tarjan, _Data Structures and Network Algorithms_, SIAM, 1983; cap. 9, _Matchings_.

### La lista de rigor (plan 07, fases 7–10)

1. Hipótesis explícitas (finito, simple, $M$ emparejamiento, blossom con tallo…); ningún «obviamente».
2. Cada paso cita la definición o el resultado que usa, por su número.
3. Casos límite tratados: camino de longitud 1, tallo de longitud 0, base expuesta, triángulo ($k=1$), $B$ extremo del camino, $U=\emptyset$, grafo sin aristas, componente aislada.
4. Notación igual a la de C13 en todas las entradas.
5. **Cotejada línea a línea con la referencia citada; la línea de referencia nombra capítulo, sección y número de resultado de la edición usada.** ← abierta
6. Un ejemplo trabajado sobre el jardín del diagrama de Intuición.
7. Nombra su testigo del núcleo, y el test existe.
8. Todas sus fórmulas se renderizan.

---

## C1 — Emparejamiento («Un farol para dos»)

Referencias de la entrada: LP cap. 1; KV cap. 10, introducción. Testigos: `src/core/matching/maximal.test.ts`, `src/core/bruteforce/maximumMatching.test.ts`.

- [ ] Definiciones 1.1–1.3 (grafo simple; emparejamiento, cubierto, expuesto, $M(v)$, $V(M)$; maximal, máximo, $\nu(G)$, perfecto) coinciden con la referencia, salvo la notación de C13.
- [ ] Observación 1.7: el jardín de 1.1 es el $P_4$ de la Proposición 1.5.

#### Proposición 1.4 (Cota de la mitad)

Referencia: LP cap. 1. En la edición usada: ______________________

- [ ] $|V(M)|=2|M|$: los extremos de las aristas de $M$ son distintos dos a dos (Definición 1.2).
- [ ] $\nu(G)\le\lfloor n/2\rfloor$ por ser $|M|$ entero.
- [ ] $M$ perfecto $\iff 2|M|=n$, y entonces $n$ es par.

Notas:

#### Proposición 1.5 (Máximo frente a maximal)

Referencia: LP cap. 1; KV cap. 10, introducción. En la edición usada: ______________________

- [ ] Máximo ⇒ maximal, por contradicción con la Definición 1.3.
- [ ] Contraejemplo $P_4$: $\{BC\}$ es maximal y $\{AB,CD\}$ tiene tamaño $2=\nu(P_4)$ (cota de la Proposición 1.4).

Notas:

#### Proposición 1.6 (Un maximal vale al menos la mitad)

Referencia: KV cap. 10, introducción (o LP cap. 1). En la edición usada: ______________________

- [ ] Paso 1: cada arista de un $M^*$ máximo tiene un extremo en $V(M)$, o $M$ no sería maximal.
- [ ] Paso 2: la elección de un extremo $\varphi(e)$ es inyectiva; $\nu(G)\le|V(M)|=2|M|$.
- [ ] Caso $E=\emptyset$ y ajuste de la cota con $\{BC\}$.

Notas:

---

## C2 — Caminos alternantes y aumentantes («La cadena»)

Referencias de la entrada: LP cap. 1; KV §10.1 (_Bipartite Matching_); T cap. 9. Testigos: `src/core/matching/paths.test.ts`, `src/core/matching/augment.test.ts`.

- [ ] Definiciones 2.1 y 2.2 (camino, ciclo, alternante, aumentante; diferencia simétrica) coinciden con la referencia.
- [ ] La propiedad $(\ast)$ (la pertenencia a $M$ cambia de arista en arista) y su inducción sobre $j-i$.
- [ ] Ejemplo de la brigada (1.3): el camino aumentante, el no alternante y el alternante par.

#### Lema 2.3 (Una cadena gana exactamente uno)

Referencia: KV §10.1; LP cap. 1; T cap. 9. En la edición usada: ______________________

- [ ] Paso 0: $e_1,e_k\notin M$; por $(\ast)$, $k$ es impar y las cuentas son $j$ y $j+1$.
- [ ] Paso 1: un vértice fuera de $P$ no cambia.
- [ ] Paso 2: un vértice interno queda cubierto por exactamente una arista de $M'$.
- [ ] Paso 3: los extremos pasan a estar cubiertos, y $v_0\neq v_k$.
- [ ] Paso 4: $|M'|=|M|+1$ y $V(M')=V(M)\cup\{v_0,v_k\}$; caso $k=1$.

Notas:

#### Lema 2.4 (Cadena de ganancia 0)

Referencia: LP cap. 1. En la edición usada: ______________________

- [ ] Caso $k=0$.
- [ ] Para $k=2j\ge 2$: $e_k\in M$ y las dos cuentas valen $j$.
- [ ] Los pasos 1 y 2 del Lema 2.3 se reutilizan solo con la alternancia; $v_0$ queda cubierto y $v_k$ expuesto.

Notas:

#### Lema 2.5 (Bucle alternante)

Referencia: LP cap. 1; T cap. 9. En la edición usada: ______________________

- [ ] Paridad: por $(\ast)$ y la alternancia en $v_0$, $k$ es par; las dos cuentas valen $j$.
- [ ] Vértices: fuera del ciclo nada cambia; en el ciclo, cada vértice cambia su arista de $M$ por la otra.

Notas:

---

## C3 — Lema de Berge (1957) («El hilo ganador»)

Referencias de la entrada: LP cap. 1; KV cap. 10; C. Berge, PNAS 43 (1957). Testigos: `src/core/matching/symmetricDifference.test.ts`, `src/core/search/bipartiteSearch.test.ts`, `src/core/edmonds/solve.test.ts`.

- [ ] Grado, conexión y componentes conexas tal como se recuerdan al principio de la pestaña.
- [ ] Ejemplo del estanque (2.1–2.3): las componentes de $M\oplus M^*$ y sus cuentas.

#### Lema 3.1 (Grado a lo sumo dos)

Referencia: LP cap. 1 (o cualquier texto básico de grafos). En la edición usada: ______________________

- [ ] Elección de un camino $P$ de longitud máxima.
- [ ] Paso 1: los extremos de $P$ no tienen vecinos fuera de $P$.
- [ ] Paso 2: si $k=0$, $H$ es un vértice aislado.
- [ ] Paso 3: si $k\ge 1$, las únicas aristas que tocan $P$ son las de $P$, más $v_0v_k$ si $k\ge 2$ (y entonces hay un ciclo).
- [ ] Paso 4: por la conexión, $P$ (o el ciclo) abarca todo $H$.

Notas:

#### Teorema 3.2 (Berge, 1957)

Referencia: KV cap. 10 (teorema de Berge); LP cap. 1; Berge (1957). En la edición usada: ______________________

- [ ] (⇒) por el Lema 2.3.
- [ ] (⇐) Paso 1: $H=(V,M\oplus M^*)$ tiene grado a lo sumo $2$.
- [ ] Paso 2: dos aristas de $H$ con un extremo común están una en $M\setminus M^*$ y otra en $M^*\setminus M$.
- [ ] Paso 3: cada componente es un camino o ciclo $M$-alternante (Lema 3.1); cuentas $a_s-b_s\in\{-1,0,1\}$.
- [ ] Paso 4: $\sum_s(a_s-b_s)=|M^*|-|M|>0$, luego un camino con $a_s-b_s=1$.
- [ ] Paso 5: los extremos de ese camino están expuestos en $M$ (el paso delicado de la sección 1.3 del plan).

Notas:

#### Corolario 3.3 (Sin cadena, nadie te gana)

Referencia: KV cap. 10. En la edición usada: ______________________

- [ ] Se sigue de (⇐) del Teorema 3.2 y de la Definición 1.3.

Notas:

#### Corolario 3.4 (Tantas cadenas como la diferencia)

Referencia: LP cap. 1. En la edición usada: ______________________

- [ ] El paso 5 del Teorema 3.2 solo usa $a_s-b_s=1$: cada componente así es aumentante, y son disjuntas.
- [ ] Con el paso 4, hay al menos $|M^*|-|M|$ de ellas.

Notas:

---

## C4 — La búsqueda: el bosque alternante («Caminar de noche»)

Referencias de la entrada: KV §10.1; T cap. 9; LP cap. 1. Testigos: `src/core/search/growForest.test.ts`, `tests/support/forestInvariants.ts`, `src/core/search/bipartiteSearch.test.ts`.

- [ ] Definición 4.1 (raíces, exteriores, interiores, no alcanzados, regla de crecimiento, $T(v)$, $d(v)$) y la finitud de $T(v)$.
- [ ] La búsqueda y sus casos (i)–(iv).
- [ ] Observación 4.5: tras vaciar $Q$, todo vecino de un exterior es interior.
- [ ] Ejemplo de los dos jardineros (3.4).

#### Lema 4.2 (Invariantes del bosque)

Referencia: KV §10.1; T cap. 9. En la edición usada: ______________________

- [ ] Base: solo raíces.
- [ ] Paso, $z\in N$ y $xy\notin M$.
- [ ] Paso, propiedad 1 (padres alcanzados del mismo árbol).
- [ ] Paso, propiedad 2 (cada interior tiene a su pareja exterior como único hijo).
- [ ] Paso, propiedad 3 ($p(z)=M(z)$).
- [ ] Paso, propiedad 4 ($T(y)$ y $T(z)$ alternan, con la paridad correcta).

Notas:

#### Lema 4.3 (Dos soles de árboles distintos)

Referencia: KV §10.1; T cap. 9. En la edición usada: ______________________

- [ ] (1) $T(x)$ y $T(x')$ son disjuntos; $xx'\notin M$; la alternancia se mantiene en $x$ y en $x'$; extremos expuestos y distintos.
- [ ] (2) El caso de un vecino $y\in N$ expuesto.

Notas:

#### Proposición 4.4 (Costo de una búsqueda)

Referencia: KV §10.1; T cap. 9. En la edición usada: ______________________

- [ ] Cada vértice se etiqueta y entra en $Q$ a lo sumo una vez; cada arista se examina a lo sumo una vez desde cada extremo.
- [ ] La cuenta $O(n+m)$ con listas de adyacencia y arreglos; el caso $m=0$.

Notas:

---

## C5 — Teorema de König (1931) («Abejas, flores y espantapájaros»)

Referencias de la entrada: LP cap. 1; KV cap. 10; D. König, _Matematikai és Fizikai Lapok_ 38 (1931). Testigos: `src/core/certificates/vertexCover.test.ts`, `src/core/search/bipartiteMatching.test.ts`.

- [ ] Definición 5.1 (bipartición, cobertura por vértices, $\tau(G)$).
- [ ] Observación 5.5: $C=I$ si $N=\emptyset$, y el contraejemplo cuando $N\neq\emptyset$.
- [ ] Ejemplo del jardín de 3.8.

#### Lema 5.2 (Un espantapájaros por farol)

Referencia: LP cap. 1; KV cap. 10. En la edición usada: ______________________

- [ ] La elección $\psi(e)\in e\cap C$ es inyectiva; caso $E=\emptyset$.

Notas:

#### Lema 5.3 (Paridad de los lados)

Referencia: LP cap. 1. En la edición usada: ______________________

- [ ] En un camino, el lado cambia con la paridad del índice.
- [ ] Con la propiedad 4 del Lema 4.2, exteriores en el lado de su raíz e interiores en el opuesto; el caso (iii) nunca ocurre.

Notas:

#### Teorema 5.4 (König, 1931)

Referencia: KV cap. 10 (teorema de König); LP cap. 1; König (1931). En la edición usada: ______________________

- [ ] Paso 1: con $M$ máximo, la búsqueda vacía $Q$ (ni (ii) por el Teorema 3.2, ni (iii) por el Lema 5.3).
- [ ] Paso 2: padres de interiores y de exteriores.
- [ ] Paso 3: las aristas de $M$ desde $I$, $O$ y $N$; $|M|=|I|+|M_N|$.
- [ ] Paso 4: $|M_N|=|N\cap A|$.
- [ ] Paso 5: $C=I\cup(N\cap A)$ es una cobertura (todos los tipos de arista, incluida no alcanzado–no alcanzado).
- [ ] Paso 6: $|C|=|M|$, igualdad con el Lema 5.2; caso $E=\emptyset$.

Notas:

#### Corolario 5.6 (El certificado de una búsqueda fallida)

Referencia: LP cap. 1. En la edición usada: ______________________

- [ ] Los pasos 2 a 5 del Teorema 5.4 no usan que $M$ sea máximo; el Lema 5.2 cierra.

Notas:

---

## C6 — Grafos bipartitos y ciclos impares («Bucles impares»)

Referencias de la entrada: LP cap. 1 y cap. 9; KV cap. 10. Testigos: `src/core/graph/bipartition.test.ts`, `src/core/blossom/detect.test.ts`, `src/core/search/conflict.test.ts`, `src/core/search/autoSearch.test.ts`.

- [ ] Paseo, paseo cerrado, $\operatorname{dist}(u,v)$.
- [ ] Observación 6.5: el error depende del lado por el que se entra al triángulo.

#### Lema 6.1 (Paseo cerrado impar)

Referencia: LP cap. 1. En la edición usada: ______________________

- [ ] Inducción fuerte sobre $k$ impar; no hay paseos cerrados de longitud $1$.
- [ ] Caso 1: sin repeticiones, $W$ es un ciclo impar.
- [ ] Caso 2: con una repetición, $W$ se parte en dos paseos cerrados, uno impar y más corto.

Notas:

#### Teorema 6.2 (Bipartito si y solo si sin ciclos impares)

Referencia: LP cap. 1. En la edición usada: ______________________

- [ ] (⇒) paridad a lo largo del ciclo.
- [ ] (⇐) bipartición por la paridad de $\operatorname{dist}(s_K,\cdot)$ en cada componente; una arista entre iguales daría un paseo cerrado impar y, por el Lema 6.1, un ciclo impar.

Notas:

#### Lema 6.3 (Dos soles del mismo árbol)

Referencia: KV cap. 10; LP cap. 9. En la edición usada: ______________________

- [ ] Las posiciones $s$ y $t$ de $w$ en $T(x)$ y $T(y)$.
- [ ] (1) Los dos tramos solo comparten $w$.
- [ ] (2) $w$ es exterior (un interior tiene un solo hijo) y $xy\notin M$.
- [ ] (3) $C$ es un ciclo de longitud $d(x)+d(y)-2d(w)+1$, impar y al menos $3$.

Notas:

#### Proposición 6.4 (La búsqueda sin plegar puede mentir)

Referencia: LP cap. 9 (motivación). En la edición usada: ______________________

- [ ] La búsqueda de una sola luz en el jardín de 4.1, paso a paso, vacía la cola.
- [ ] $P=R\,a\,b\,d\,c\,e$ es $M$-aumentante.

Notas:

---

## C7 — Blossoms y contracción («La flor»)

Referencias de la entrada: KV cap. 10; LP cap. 9; J. Edmonds, _Canad. J. Math._ 17 (1965). Testigos: `src/core/blossom/isBlossom.test.ts`, `src/core/blossom/walk.test.ts`, `src/core/blossom/contract.test.ts`, `src/core/blossom/detect.test.ts`, `src/core/edmonds/foldForest.test.ts`.

- [ ] Definición 7.1 (blossom, base única, tallo, flor) y su comparación con la de la referencia.
- [ ] Definición 7.3 ($G/B$ simple, $M/B$).
- [ ] Ejemplo de los cinco pétalos (4.6).

#### Lema 7.2 (La vuelta que alterna)

Referencia: KV cap. 10; Edmonds (1965). En la edición usada: ______________________

- [ ] (1) Inducción: $v_{2l-1}v_{2l}\in M$; alternancia salvo en $b$; la única arista de $M$ que sale de $B$ es $bM(b)$.
- [ ] (2) $P^+$ y $P^-$ alternan, tienen longitudes de paridad distinta, y el par termina con una arista de $M$; caso $i=0$.

Notas:

#### Lema 7.4 (El emparejamiento contraído)

Referencia: KV cap. 10; LP cap. 9. En la edición usada: ______________________

- [ ] Clasificación de las aristas de $M$: $|M|=|M_{\text{out}}|+k+\varepsilon$.
- [ ] (1) $M/B$ es emparejamiento y $|M/B|=|M|-k$.
- [ ] (2) Las aristas de $M/B$.
- [ ] (3) Exposición en $M/B$ frente a $M$.

Notas:

#### Lema 7.5 (La flor que encuentra la búsqueda)

Referencia: KV cap. 10; Edmonds (1965). En la edición usada: ______________________

- [ ] (1) Aristas de $M$ en $C$: $C$ es un blossom con base $w$.
- [ ] (1) El tallo: $T(w)$ al revés solo toca $C$ en $w$.
- [ ] (2) Hechos (a)–(d) sobre padres en $C$ y la pareja de $C$ en $M/C$.
- [ ] (2) Propiedades 1 a 4 del Lema 4.2 en $F/C$.

Notas:

---

## C8 — Lema de la flor (Edmonds, 1965) («Plegar no esconde cadenas»)

Referencias de la entrada: KV cap. 10 (lema de contracción); LP cap. 9; T cap. 9; Edmonds (1965). Testigos: `src/core/blossom/liftPath.test.ts`, `src/core/blossom/cutAtFlower.test.ts`, `src/core/blossom/rotateStem.test.ts`, `src/core/blossom/contract.test.ts`. Hipótesis de toda la página: $B$ es un blossom **con tallo**.

- [ ] Observación 8.4: el contraejemplo sin tallo (vértices $b,c,d,u,p,q$) hace fallar de verdad (⇒).
- [ ] Ejemplo del reto de la flor (4.11).

#### Teorema 8.1 (Lema de la flor)

Referencia: KV cap. 10 (lema de contracción); Edmonds (1965). En la edición usada: ______________________

- [ ] (⇐) Caso 1: $P'$ no pasa por $B$.
- [ ] (⇐) Caso 2: $B$ es un extremo de $P'$ ($b$ expuesta); se añade el camino par del Lema 7.2.
- [ ] (⇐) Caso 3: $B$ es interno; se entra por un pétalo y se sale por la base; alternancia en las dos uniones.
- [ ] (⇒) Giro del tallo con el Lema 8.3 (sin círculo: el Lema 8.3 solo usa los Lemas 2.4 y 7.4).
- [ ] (⇒) Paso 1: un camino $M'$-aumentante existe (Teorema 3.2).
- [ ] (⇒) Paso 2: un extremo está fuera de $B$.
- [ ] (⇒) Paso 3: el trozo hasta el primer vértice de $B$ es $M'/B$-aumentante en $G/B$.
- [ ] (⇒) Paso 4: de $M'/B$ a $M/B$ por los tamaños.

Notas:

#### Corolario 8.2 (Plegar conserva el máximo)

Referencia: KV cap. 10. En la edición usada: ______________________

- [ ] Teorema 3.2 en $G$, Teorema 8.1 y Teorema 3.2 en $G/B$.

Notas:

#### Lema 8.3 (Girar el tallo)

Referencia: LP cap. 9; KV cap. 10. En la edición usada: ______________________

- [ ] Caso $j=0$.
- [ ] Para $j\ge 1$, el Lema 2.4: mismo tamaño y $b$ expuesta.
- [ ] Ninguna arista del tallo está en $B$; $B$ sigue siendo blossom con base $b$, y $|M'/B|=|M/B|$.

Notas:

---

## C9 — Blossoms anidados («Flores anidadas»)

Referencias de la entrada: KV cap. 10; LP cap. 9; Edmonds (1965). Testigos: `src/core/blossom/hierarchy.test.ts`, `src/core/blossom/expand.test.ts`, `src/core/edmonds/phase.test.ts`, `src/core/generators/hardCases.test.ts` (`nestedFlowers`).

- [ ] Definición 9.1 (sucesión de contracciones, $\hat V(X)$, $\beta(X)$).
- [ ] Ejemplo de una flor dentro de otra (5.1).

#### Lema 9.2 (Lo que guarda un nodo)

Referencia: KV cap. 10; LP cap. 9. En la edición usada: ______________________

- [ ] Base $i=0$ de (1)–(3).
- [ ] (1) La partición se conserva y $|\hat V(B)|$ es suma de $2h+1$ impares.
- [ ] (3) Aristas de $G_{i+1}$ y de $M_{i+1}$, y la arista de $M$ entre bases.
- [ ] (2) Los vértices distintos de la base, cubiertos dentro de $\hat V(B)$ (casos $v\neq\beta(Y_l)$ y $v=\beta(Y_l)$).
- [ ] (4) Exposición de $X$ frente a $\beta(X)$, y $|M_i|$.

Notas:

#### Lema 9.3 (El camino par por dentro)

Referencia: KV cap. 10; LP cap. 9. En la edición usada: ______________________

- [ ] Inducción sobre $i$; elección del sentido del ciclo con el Lema 7.2; caso $l=0$.
- [ ] Caso $l\ge 2$: el camino $Q_B(v)$ por trozos y sus uniones.
- [ ] Es un camino dentro de $\hat V(B)$.
- [ ] Longitud par.
- [ ] Alterna, en cada clase de unión.
- [ ] Termina con una arista de $M$.

Notas:

#### Proposición 9.4 (Desplegar de fuera hacia dentro)

Referencia: KV cap. 10; LP cap. 9. En la edición usada: ______________________

- [ ] (1) Cada $P_i$ es $M_i$-aumentante y las flores se abren de fuera hacia dentro.
- [ ] (2) Por dónde entra y sale el camino de un blossom interno (caso 3 del Teorema 8.1).
- [ ] (3) La afirmación $A(i)$ por inducción, y el extremo $\beta(X)$ de cada tramo.

Notas:

#### Teorema 9.5 (El lema de la flor, flor dentro de flor)

Referencia: KV cap. 10. En la edición usada: ______________________

- [ ] Inducción sobre $k$ con el Teorema 8.1 en cada paso (cada $B_i$ con tallo).
- [ ] La dirección (⇐) es la Proposición 9.4 y no necesita tallo.

Notas:

---

## C10 — El algoritmo de Edmonds («La receta»)

Referencias de la entrada: KV cap. 10; LP cap. 9; T cap. 9; Edmonds (1965). Testigos: `src/core/edmonds/foldForest.test.ts`, `src/core/edmonds/search.test.ts`, `src/core/edmonds/solve.test.ts`, `src/core/recipe/run.test.ts`.

- [ ] Algoritmo 10.1: el pseudocódigo coincide con `src/core/edmonds/solve.ts` y `phase.ts`, y con el de la referencia salvo lo que se declara.
- [ ] La tabla tarjeta ↔ línea y las tres tarjetas distractoras.
- [ ] Ejemplo del autómata (6.2).

#### Lema 10.2 (Invariantes de la búsqueda)

Referencia: KV cap. 10. En la edición usada: ______________________

- [ ] Inicio de la fase: el bosque inicial cumple 1 a 4, $Q=R$ y los expuestos son las raíces.
- [ ] Caso (b): crecer conserva las propiedades.
- [ ] Caso (d): plegar conserva las propiedades (Lemas 6.3 y 7.5), y el blossom tiene tallo.
- [ ] Los casos (a) y (c) terminan la búsqueda y el (e) no cambia nada.

Notas:

#### Lema 10.3 (Lo que deja una búsqueda que falla)

Referencia: KV cap. 10. En la edición usada: ______________________

- [ ] (1) Hechos (α) y (β), y todo vecino de un exterior es interior.
- [ ] (2) En un camino aumentante de $G_k$, la alternancia de exteriores e interiores y la cuenta que lleva a contradicción.

Notas:

#### Teorema 10.4 (Corrección)

Referencia: KV cap. 10 (corrección del algoritmo de Edmonds). En la edición usada: ______________________

- [ ] Paso 4: el camino de $G'$ se levanta a $G$ (Proposición 9.4) y aumenta $|M|$ en uno.
- [ ] Paso 3: Lema 10.3, Teorema 9.5 y Teorema 3.2 dan que $M$ es máximo.

Notas:

#### Teorema 10.5 (Terminación)

Referencia: KV cap. 10. En la edición usada: ______________________

- [ ] Una fase termina: cada contracción baja los nodos en al menos $2$; etiquetas y exámenes acotados.
- [ ] Hay a lo sumo $\lfloor n/2\rfloor-|M_0|+1$ fases (Proposición 1.4).

Notas:

---

## C11 — Análisis de costo («El costo»)

Referencias de la entrada: KV cap. 10 (tiempo de ejecución); T cap. 9; LP cap. 9; Micali y Vazirani (1980). Testigos: `src/core/edmonds/solve.test.ts`, `src/core/edmonds/search.cost.test.ts`, `src/core/edmonds/fast/solve.test.ts`, `src/core/cost/benchmark.test.ts`, `src/core/bruteforce/countMatchings.test.ts`, `tests/races.test.ts`.

- [ ] Definición 11.1 (modelo de costo, operaciones elementales, $O$).
- [ ] Observación 11.7 (sin demostración: fuera de alcance) cita bien a Micali–Vazirani y a Gabow–Tarjan.
- [ ] Ejemplo de las carreras (6.4 y 6.5).

#### Proposición 11.2 (Costo del Algoritmo 10.1)

Referencia: KV cap. 10. En la edición usada: ______________________

- [ ] (1) Pasos de traza por fase y número de fases: $O(n^3)$ pasos en total.
- [ ] (2) Operaciones por fase con contracciones explícitas: $O(n(n+m))$; total $O(n^2(n+m))$.
- [ ] La implementación del núcleo hace lo que la cuenta supone.

Notas:

#### Lema 11.3 (Una búsqueda por raíz)

Referencia: KV cap. 10; T cap. 9. En la edición usada: ______________________

- [ ] $r\notin V(P)$ y $r$ sigue expuesto en $M'$.
- [ ] Si $Q$ no toca $P$, es $M$-aumentante desde $r$.
- [ ] Si lo toca: el primer vértice de $Q$ en $P$, y los tres casos (extremo, o seguir $P$ por la arista de $M$ hacia un lado).

Notas:

#### Lema 11.4 (Una búsqueda de una sola raíz que falla)

Referencia: T cap. 9. En la edición usada: ______________________

- [ ] Los Lemas 10.2(1)–(3) y 10.3(1) valen con $R=\{r\}$.
- [ ] Componentes: cada $\hat V(X)$ exterior es una componente de $G-U$.
- [ ] Cuenta: $|U|=|O_k|-1$.
- [ ] Exposición: solo la base de cada exterior puede estar expuesta.
- [ ] Un camino $M$-aumentante desde $r$: en $M\oplus E(P)$ cada componente impar empareja algún vértice fuera de ella, con $U$, y la cuenta $|U|=|O_k|-1$ no alcanza.

Notas:

#### Teorema 11.5 (La versión compacta)

Referencia: T cap. 9 (implementación); KV cap. 10. En la edición usada: ______________________

- [ ] Corrección: cada raíz se busca una vez (Lemas 11.3 y 11.4), y el resultado es máximo.
- [ ] Costo: $n$ búsquedas de $O(m)$ exámenes, a lo sumo $n/2$ contracciones de $O(n)$ y un aumento de $O(n)$: $O(n^3)$.
- [ ] El contador del núcleo cuenta lo que dice la demostración.

Notas:

#### Proposición 11.6 (Bruto es exponencial)

Referencia: LP cap. 1 o cualquier texto de combinatoria. En la edición usada: ______________________

- [ ] (1) Recurrencia de Fibonacci para $P_n$ y $F_{n+1}\ge\varphi^{\,n-1}$.
- [ ] (2) $(2k-1)!!$ perfectos en $K_{2k}$ y la cota $\ge k!$.
- [ ] (3) Bruto examina al menos un paso por emparejamiento.

Notas:

---

## C12 — Fórmula de Tutte–Berge (1958) («Las piedras»)

Referencias de la entrada: LP cap. 3; KV cap. 10; W. T. Tutte, _J. London Math. Soc._ 22 (1947); C. Berge, _C. R. Acad. Sci. Paris_ 247 (1958). Testigos: `src/core/certificates/tutteBerge.test.ts`, `src/core/certificates/fromForest.test.ts`, `src/core/certificates/oddComponents.test.ts`, `src/core/edmonds/solve.test.ts`.

- [ ] Definición 12.1 ($\operatorname{def}(G)$, $\operatorname{odd}(H)$).
- [ ] Ejemplo de la hélice (7.3) y del regalo de la búsqueda (7.4).

#### Lema 12.2 (La cota de las piedras)

Referencia: LP cap. 3; KV cap. 10. En la edición usada: ______________________

- [ ] En cada componente impar de $G-U$ queda un vértice no emparejado dentro.
- [ ] Ese vértice está expuesto o emparejado con $U$, y a lo sumo $|U|$ lo están con $U$; caso $U=\emptyset$.

Notas:

#### Teorema 12.3 (Tutte–Berge)

Referencia: LP cap. 3 (fórmula de Tutte–Berge); KV cap. 10; Berge (1958). En la edición usada: ______________________

- [ ] El mínimo existe y es al menos $\nu(G)$ (Lema 12.2).
- [ ] Paso 1: cada exterior (sol o flor) es una componente impar de $G-U$, con $U=I$ (Lema 9.3).
- [ ] Paso 2: las demás componentes son pares ($M$ empareja $N_k$ perfectamente).
- [ ] Paso 3: la cuenta da $|M|$, y con el Lema 12.2 hay igualdad.

Notas:

#### Corolario 12.4 (Tutte, 1947)

Referencia: LP cap. 3; KV cap. 10; Tutte (1947). En la edición usada: ______________________

- [ ] (⇒) por el Lema 12.2.
- [ ] (⇐) por el Teorema 12.3 y la Proposición 1.4.

Notas:

#### Corolario 12.5 (König, otra vez)

Referencia: LP cap. 3. En la edición usada: ______________________

- [ ] Sin contracciones en un bipartito (Lema 5.3).
- [ ] $U=I$ alcanza el mínimo y $C=I\cup(N\cap A)$ es la cobertura de C5.

Notas:

---

## C13 — Glosario y notación («Cada cosa tiene un nombre»)

Referencias de la entrada: LP cap. 1; KV cap. 10; T cap. 9. No tiene resultados que demostrar.

- [ ] Cada símbolo de la tabla significa lo mismo en todas las entradas y enlaza a donde se define.
- [ ] Las diferencias de notación con la referencia, si las hay, están declaradas.

---

## C14 — Aplicaciones del emparejamiento máximo («Más allá del jardín»)

Referencias de la entrada: KV cap. 10 y cap. 11; LP cap. 1; Roth, Sönmez y Ünver, _J. Econ. Theory_ 125 (2005); P. Hall, _J. London Math. Soc._ 10 (1935); Cyvin y Gutman (1988). Testigos: `src/core/edmonds/solve.test.ts`, `src/core/bruteforce/countPerfectMatchings.test.ts`, `src/core/certificates/vertexCover.test.ts`.

- [ ] Modelos 14.1, 14.3 y 14.5 (riñones, Kekulé, asignaciones) son fieles a sus fuentes.
- [ ] Observación 14.7 (sin demostración: fuera de alcance).
- [ ] La bibliografía completa del Códex.

#### Proposición 14.2 (Un plan es un emparejamiento)

Referencia: Roth, Sönmez y Ünver (2005). En la edición usada: ______________________

- [ ] Los planes son exactamente los emparejamientos de $G$, con $2|M|$ trasplantes; el máximo es $2\nu(G)$.

Notas:

#### Proposición 14.4 (Las dos estructuras del benceno)

Referencia: Cyvin y Gutman (1988); LP cap. 1. En la edición usada: ______________________

- [ ] Los ciclos pares: $M^+$ y $M^-$ son perfectos y distintos, y no hay otros.
- [ ] Un ciclo impar no tiene ninguno.
- [ ] El naftaleno: casos $xy\in M$ y $xy\notin M$; total $3$.

Notas:

#### Teorema 14.6 (Hall, 1935)

Referencia: LP cap. 1 (teorema de Hall); Hall (1935). En la edición usada: ______________________

- [ ] (⇒) $M(\cdot)$ es inyectiva de $S$ en $\Gamma(S)$.
- [ ] (⇐) por contrarrecíproco con König (Teorema 5.4): la cobertura $C$ da un $S$ con $|\Gamma(S)|<|S|$.
- [ ] Caso $A=\emptyset$.

Notas:
