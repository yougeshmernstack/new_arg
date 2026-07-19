import { useCallback, useEffect, useState } from 'react';
import { distributorApi } from '../../api';

const TREE_DEPTH = 2; // root + 2 child levels = 3 visual levels

function MemberRow({ member }) {
  return (
    <li className="binary-member">
      <strong>{member.username}</strong>
      <span>{member.name || '—'}</span>
      <em>{member.position || '—'}</em>
    </li>
  );
}

function TreeNode({ node, depth = 0, maxDepth = TREE_DEPTH, onOpen }) {
  if (!node) {
    return (
      <div className="binary-node binary-node-empty">
        <span>Empty</span>
      </div>
    );
  }

  const showChildren = depth < maxDepth;
  // Any filled node below the current root can be opened as its own tree
  const canOpen = depth > 0 && typeof onOpen === 'function';
  const nodeClass = `binary-node${depth === 0 ? ' binary-node-root' : ''}${canOpen ? ' binary-node-openable' : ''}`;
  const nodeBody = (
    <>
      <strong>{node.username}</strong>
      <span>{node.name || '—'}</span>
      {node.position ? <em>{node.position}</em> : null}
      {canOpen ? <em className="binary-node-hint">Open tree</em> : null}
    </>
  );

  return (
    <div className="binary-node-wrap">
      {canOpen ? (
        <button
          type="button"
          className={nodeClass}
          onClick={() => onOpen(node)}
          title={`Open ${node.username}'s tree`}
        >
          {nodeBody}
        </button>
      ) : (
        <div className={nodeClass}>{nodeBody}</div>
      )}
      {showChildren ? (
        <div className="binary-branches">
          <div className="binary-branch">
            <span className="binary-branch-label">L</span>
            <TreeNode node={node.left} depth={depth + 1} maxDepth={maxDepth} onOpen={onOpen} />
          </div>
          <div className="binary-branch">
            <span className="binary-branch-label">R</span>
            <TreeNode node={node.right} depth={depth + 1} maxDepth={maxDepth} onOpen={onOpen} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function BinaryTeam() {
  const [left, setLeft] = useState([]);
  const [right, setRight] = useState([]);
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [treeLoading, setTreeLoading] = useState(false);
  const [error, setError] = useState('');
  const [trail, setTrail] = useState([]); // [{ uid, username }]

  const loadTree = useCallback(async (rootUid) => {
    setTreeLoading(true);
    setError('');
    try {
      const params = { depth: TREE_DEPTH };
      if (rootUid != null) params.root = rootUid;
      const treeRes = await distributorApi.getBinaryTree(params);
      setTree(treeRes.data?.data || null);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load binary tree');
      return false;
    } finally {
      setTreeLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [legsRes, treeRes] = await Promise.all([
          distributorApi.getBinaryLegs(),
          distributorApi.getBinaryTree({ depth: TREE_DEPTH }),
        ]);
        if (!active) return;
        setLeft(legsRes.data?.data?.left || []);
        setRight(legsRes.data?.data?.right || []);
        setTree(treeRes.data?.data || null);
        setTrail([]);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load binary team');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const openNode = async (node) => {
    if (!node?.uid) return;
    const ok = await loadTree(node.uid);
    if (ok) setTrail((prev) => [...prev, { uid: node.uid, username: node.username }]);
  };

  const goToTrailIndex = async (index) => {
    if (index < 0) {
      const ok = await loadTree(undefined);
      if (ok) setTrail([]);
      return;
    }
    const target = trail[index];
    if (!target) return;
    const ok = await loadTree(target.uid);
    if (ok) setTrail((prev) => prev.slice(0, index + 1));
  };

  return (
    <div className="page">
      <div className="page-head">
        <h2>Binary Team</h2>
        <p className="page-sub">Your left and right legs by parent placement, plus the binary tree</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {loading ? <div className="card">Loading binary team...</div> : null}

      {!loading ? (
        <div className="binary-layout">
          <aside className="binary-leg-panel">
            <div className="binary-leg-head">
              <h3>Left</h3>
              <span>{left.length}</span>
            </div>
            {left.length ? (
              <ul className="binary-member-list">
                {left.map((m) => (
                  <MemberRow key={m.uid} member={m} />
                ))}
              </ul>
            ) : (
              <p className="binary-empty">No members on left</p>
            )}
          </aside>

          <section className="binary-tree-panel card">
            <div className="binary-leg-head">
              <h3>Binary tree</h3>
              {trail.length ? (
                <button type="button" className="binary-tree-back" onClick={() => goToTrailIndex(trail.length - 2)}>
                  Back
                </button>
              ) : null}
            </div>

            {trail.length ? (
              <nav className="binary-tree-trail" aria-label="Tree path">
                <button type="button" onClick={() => goToTrailIndex(-1)}>
                  You
                </button>
                {trail.map((item, i) => (
                  <span key={`${item.uid}-${i}`} className="binary-tree-trail-item">
                    <span className="binary-tree-trail-sep">/</span>
                    <button
                      type="button"
                      onClick={() => goToTrailIndex(i)}
                      disabled={i === trail.length - 1}
                    >
                      {item.username}
                    </button>
                  </span>
                ))}
              </nav>
            ) : (
              <p className="binary-tree-hint">Showing 3 levels. Click any member to open their tree.</p>
            )}

            <div className={`binary-tree-scroll${treeLoading ? ' is-loading' : ''}`}>
              {tree ? (
                <TreeNode node={tree} onOpen={openNode} />
              ) : (
                <p className="binary-empty">No tree data</p>
              )}
            </div>
          </section>

          <aside className="binary-leg-panel">
            <div className="binary-leg-head">
              <h3>Right</h3>
              <span>{right.length}</span>
            </div>
            {right.length ? (
              <ul className="binary-member-list">
                {right.map((m) => (
                  <MemberRow key={m.uid} member={m} />
                ))}
              </ul>
            ) : (
              <p className="binary-empty">No members on right</p>
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
