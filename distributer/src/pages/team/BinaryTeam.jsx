import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { distributorApi } from '../../api';

const TREE_DEPTH = 2; // root + 2 child levels = 3 visual levels

function formatBv(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function NodeTooltip({ node, anchorRect }) {
  if (!node || !anchorRect) return null;

  const gap = 12;
  const tooltipWidth = 268;
  let left = anchorRect.left + anchorRect.width / 2 - tooltipWidth / 2;
  left = Math.max(12, Math.min(left, window.innerWidth - tooltipWidth - 12));

  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const placeAbove = spaceBelow < 220 && anchorRect.top > 220;
  const top = placeAbove ? undefined : anchorRect.bottom + gap;
  const bottom = placeAbove ? window.innerHeight - anchorRect.top + gap : undefined;

  const initial = (node.name || node.username || '?').trim().charAt(0).toUpperCase();
  const isActive = String(node.status || '').toLowerCase() === 'active';
  const side = String(node.position || '').toLowerCase();

  return createPortal(
    <div
      className={`binary-node-tooltip${placeAbove ? ' is-above' : ''}`}
      style={{ left, top, bottom, width: tooltipWidth }}
      role="tooltip"
    >
      <div className="binary-tip-head">
        <span className="binary-tip-avatar" aria-hidden="true">
          {initial}
        </span>
        <div className="binary-tip-identity">
          <strong>{node.username}</strong>
          <span>{node.name || '—'}</span>
        </div>
        <em className={`binary-tip-status${isActive ? ' is-active' : ''}`}>
          {isActive ? 'Active' : 'Inactive'}
        </em>
      </div>

      <div className="binary-tip-package">
        <span>Package</span>
        <strong>{node.package_name || 'No package'}</strong>
      </div>

      <div className="binary-tip-legs">
        <div className="binary-tip-leg binary-tip-leg-left">
          <header>
            <span>Left</span>
            {side === 'left' ? <em>Side</em> : null}
          </header>
          <div>
            <span>Team</span>
            <strong>{Number(node.left_team) || 0}</strong>
          </div>
          <div>
            <span>Business</span>
            <strong>{formatBv(node.left_business)}</strong>
          </div>
        </div>
        <div className="binary-tip-leg binary-tip-leg-right">
          <header>
            <span>Right</span>
            {side === 'right' ? <em>Side</em> : null}
          </header>
          <div>
            <span>Team</span>
            <strong>{Number(node.right_team) || 0}</strong>
          </div>
          <div>
            <span>Business</span>
            <strong>{formatBv(node.right_business)}</strong>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function TreeNode({ node, depth = 0, maxDepth = TREE_DEPTH, onOpen, rootRef, onHover }) {
  if (!node) {
    return (
      <div className="binary-node binary-node-empty">
        <span>Empty</span>
      </div>
    );
  }

  const showChildren = depth < maxDepth;
  const canOpen = depth > 0 && typeof onOpen === 'function';
  const isActive = String(node.status || '').toLowerCase() === 'active';
  const initial = (node.name || node.username || '?').trim().charAt(0).toUpperCase();
  const nodeClass = [
    'binary-node',
    depth === 0 ? 'binary-node-root' : '',
    canOpen ? 'binary-node-openable' : '',
    isActive ? 'is-active' : 'is-inactive',
  ]
    .filter(Boolean)
    .join(' ');

  const showHover = (el) => {
    if (!onHover || !el) return;
    onHover({ node, rect: el.getBoundingClientRect() });
  };

  const clearHover = () => {
    if (onHover) onHover(null);
  };

  const nodeBody = (
    <>
      <span className="binary-node-avatar" aria-hidden="true">
        {initial}
      </span>
      <strong>{node.username}</strong>
      <span className="binary-node-name">{node.name || '—'}</span>
      <em className={`binary-node-status${isActive ? ' is-active' : ' is-inactive'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </em>
      {node.position ? (
        <em className={`binary-node-side binary-node-side-${node.position}`}>
          {node.position}
        </em>
      ) : null}
      {canOpen ? <em className="binary-node-hint">Open tree</em> : null}
    </>
  );

  const hoverProps = {
    onMouseEnter: (e) => showHover(e.currentTarget),
    onMouseLeave: clearHover,
    onFocus: (e) => showHover(e.currentTarget),
    onBlur: clearHover,
  };

  return (
    <div className="binary-node-wrap">
      {canOpen ? (
        <button
          type="button"
          className={nodeClass}
          onClick={() => onOpen(node)}
          title={`Open ${node.username}'s tree`}
          {...hoverProps}
        >
          {nodeBody}
        </button>
      ) : (
        <div
          className={nodeClass}
          ref={depth === 0 ? rootRef : undefined}
          tabIndex={0}
          {...hoverProps}
        >
          {nodeBody}
        </div>
      )}
      {showChildren ? (
        <div className="binary-branches">
          <div className="binary-branch">
            <span className="binary-branch-label">L</span>
            <TreeNode
              node={node.left}
              depth={depth + 1}
              maxDepth={maxDepth}
              onOpen={onOpen}
              onHover={onHover}
            />
          </div>
          <div className="binary-branch">
            <span className="binary-branch-label">R</span>
            <TreeNode
              node={node.right}
              depth={depth + 1}
              maxDepth={maxDepth}
              onOpen={onOpen}
              onHover={onHover}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function BinaryTeam() {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [treeLoading, setTreeLoading] = useState(false);
  const [error, setError] = useState('');
  const [trail, setTrail] = useState([]); // [{ uid, username }]
  const [hoverTip, setHoverTip] = useState(null);
  const scrollRef = useRef(null);
  const rootNodeRef = useRef(null);

  const centerTreeInView = useCallback(() => {
    const scroller = scrollRef.current;
    const rootEl = rootNodeRef.current;
    if (!scroller || !rootEl) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const rootRect = rootEl.getBoundingClientRect();
    const rootCenter = rootRect.left + rootRect.width / 2;
    const viewCenter = scrollerRect.left + scroller.clientWidth / 2;
    scroller.scrollLeft += rootCenter - viewCenter;
  }, []);

  const loadTree = useCallback(async (rootUid) => {
    setTreeLoading(true);
    setError('');
    setHoverTip(null);
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
        const treeRes = await distributorApi.getBinaryTree({ depth: TREE_DEPTH });
        if (!active) return;
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

  useLayoutEffect(() => {
    if (loading || treeLoading || !tree) return;
    centerTreeInView();
    const id = requestAnimationFrame(() => centerTreeInView());
    return () => cancelAnimationFrame(id);
  }, [loading, treeLoading, tree, trail, centerTreeInView]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => centerTreeInView());
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [centerTreeInView, loading]);

  useEffect(() => {
    if (!hoverTip) return undefined;
    const clear = () => setHoverTip(null);
    window.addEventListener('scroll', clear, true);
    window.addEventListener('resize', clear);
    return () => {
      window.removeEventListener('scroll', clear, true);
      window.removeEventListener('resize', clear);
    };
  }, [hoverTip]);

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
        <p className="page-sub">Your binary tree by parent placement</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {loading ? <div className="card">Loading binary team...</div> : null}

      {!loading ? (
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
            <div className="binary-tree-meta">
              <p className="binary-tree-hint">
                Showing 3 levels. Hover any ID for package &amp; team details. Click a member to open their tree.
              </p>
              <div className="binary-tree-legend" aria-label="Status colors">
                <span className="binary-legend-active">Active</span>
                <span className="binary-legend-inactive">Inactive</span>
              </div>
            </div>
          )}

          <div
            ref={scrollRef}
            className={`binary-tree-scroll${treeLoading ? ' is-loading' : ''}`}
          >
            <div className="binary-tree-canvas">
              {tree ? (
                <TreeNode
                  node={tree}
                  onOpen={openNode}
                  rootRef={rootNodeRef}
                  onHover={setHoverTip}
                />
              ) : (
                <p className="binary-empty">No tree data</p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {hoverTip ? <NodeTooltip node={hoverTip.node} anchorRect={hoverTip.rect} /> : null}
    </div>
  );
}
