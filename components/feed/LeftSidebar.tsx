// Static/decorative left sidebar (Explore, Suggested people, Events).
export default function LeftSidebar() {
  const suggested = [
    { img: "people2.png", name: "Ryan Roslansky", role: "CEO of LinkedIn" },
    { img: "people3.png", name: "Melinda Gates", role: "Philanthropist" },
  ];
  return (
    <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
      <div className="_layout_left_sidebar_wrap">
        <div className="_layout_left_sidebar_inner">
          <div className="_left_inner_area_explore _padd_t24 _padd_b6 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area _mar_b16">
            <div className="_left_inner_area_explore_content _mar_b24">
              <h4 className="_left_inner_area_explore_content_title">Explore</h4>
            </div>
            <ul className="_left_inner_area_explore_list">
              {["Learning", "Insights", "Find friends", "Bookmarks", "Groups"].map(
                (t) => (
                  <li className="_left_inner_area_explore_item" key={t}>
                    <span className="_left_inner_area_explore_link">{t}</span>
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="_left_inner_area_suggest _padd_t24 _padd_b6 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
            <div className="_left_inner_area_explore_content _mar_b24">
              <h4 className="_left_inner_area_explore_content_title">
                Suggested people
              </h4>
            </div>
            {suggested.map((p) => (
              <div className="_left_inner_area_suggest_info _mar_b24" key={p.name}>
                <div className="_left_inner_area_suggest_info_image">
                  <img
                    src={`/assets/images/${p.img}`}
                    alt=""
                    className="_info_img"
                  />
                </div>
                <div className="_left_inner_area_suggest_info_txt">
                  <h4 className="_info_title">{p.name}</h4>
                  <p className="_info_para">{p.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
